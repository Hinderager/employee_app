import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Workiz API credentials
const WORKIZ_API_KEY = process.env.WORKIZ_API_KEY || 'api_c3o9qvf0tpw86oqmkygifxjmadj3uvcw';
const WORKIZ_API_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/all/`;

// Helper function to normalize phone numbers (strips non-numeric characters)
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Initialize OAuth client
function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NODE_ENV === 'production'
      ? process.env.GOOGLE_REDIRECT_URI
      : 'http://localhost:3001/api/auth/google/callback'
  );
}

// Get Drive client with OAuth tokens from environment variables (server-side)
async function getDriveClient() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error('Server not configured with Google Drive credentials');
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Refresh the access token automatically
  await oauth2Client.getAccessToken();

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Sanitize address string for use as folder name
function sanitizeAddressForFolderName(address: string): string {
  const sanitized = address
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);

  if (!sanitized) {
    return 'Untitled Folder';
  }
  return sanitized;
}

// Find or create Google Drive folder for job address
// Folders are stored in: My Drive\Pictures\from employee app\by address\
async function findOrCreateAddressFolder(drive: any, address: string): Promise<string> {
  // Hardcoded parent folder ID for "by address" folder
  const byAddressFolderId = '1cDg6cjZR1ZaQL1EhxAi99e-wRNy-kL74';

  console.log('[move-wt/load-job] Searching for address folder:', address);

  const targetFolderName = sanitizeAddressForFolderName(address);
  console.log('[move-wt/load-job] Sanitized folder name:', targetFolderName);

  // Escape single quotes in folder name for Google Drive query (single quotes must be escaped with backslash)
  const escapedFolderName = targetFolderName.replace(/'/g, "\\'");

  // Search for existing folder with this address name in the "by address" folder
  const folderSearchResponse = await drive.files.list({
    q: `name='${escapedFolderName}' and '${byAddressFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, parents)',
    pageSize: 100, // Increased to check more folders
  });

  console.log('[move-wt/load-job] Search returned', folderSearchResponse.data.files?.length || 0, 'folders');

  // If folder exists, use it
  if (folderSearchResponse.data.files && folderSearchResponse.data.files.length > 0) {
    // Check for exact match (case-insensitive)
    const exactMatch = folderSearchResponse.data.files.find(
      (file: any) => file.name.toLowerCase() === targetFolderName.toLowerCase()
    );

    if (exactMatch) {
      console.log('[move-wt/load-job] Found existing address folder:', exactMatch.id, '- Name:', exactMatch.name);
      return exactMatch.id!;
    }

    // If no exact match but files were returned, log warning
    console.log('[move-wt/load-job] WARNING: Found folders but no exact match. Using first folder:', folderSearchResponse.data.files[0].name);
    return folderSearchResponse.data.files[0].id!;
  }

  // Folder doesn't exist - create it in the "by address" folder
  console.log('[move-wt/load-job] Address folder not found, creating new one in "by address" folder...');
  console.log('[move-wt/load-job] Creating folder with name:', targetFolderName);

  const folderMetadata = {
    name: targetFolderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [byAddressFolderId],
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id, name',
  });

  console.log('[move-wt/load-job] Created new address folder:', folder.data.id, '- Name:', folder.data.name);
  return folder.data.id!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobNumber, phoneNumber, quoteNumber } = body;

    // Require at least one parameter
    if ((!jobNumber || !jobNumber.trim()) && (!phoneNumber || !phoneNumber.trim()) && (!quoteNumber || !quoteNumber.trim())) {
      return NextResponse.json(
        { error: 'Either job number, phone number, or quote number is required' },
        { status: 400 }
      );
    }

    // Priority 0: If quote number is provided, load directly from Supabase
    if (quoteNumber && quoteNumber.trim()) {
      console.log(`[move-wt/load-job] Loading form by quote number: ${quoteNumber}`);

      const { data: quoteData, error } = await supabase
        .from('move_quote')
        .select('*')
        .eq('quote_number', quoteNumber.trim())
        .single();

      if (error || !quoteData) {
        console.error('[move-wt/load-job] Quote not found:', error);
        return NextResponse.json(
          { error: `Quote #${quoteNumber} not found` },
          { status: 404 }
        );
      }

      console.log('[move-wt/load-job] Found quote:', quoteData.quote_number);

      let folderUrl = null;
      const address = quoteData.customer_home_address || quoteData.form_data?.pickupAddress;
      if (address) {
        try {
          const drive = await getDriveClient();
          const folderId = await findOrCreateAddressFolder(drive, address);
          folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
        } catch (folderError) {
          console.error('[move-wt/load-job] Error getting folder:', folderError);
        }
      }

      return NextResponse.json({
        success: true,
        job_number: quoteData.job_number || '',
        quoteNumber: quoteData.quote_number,
        address: address || '',
        folder_url: folderUrl,
        customerInfo: {
          firstName: quoteData.form_data?.firstName || '',
          lastName: quoteData.form_data?.lastName || '',
          phone: quoteData.phone_number || '',
          email: quoteData.form_data?.email || '',
        },
        formData: quoteData.form_data || {},
        phones: quoteData.form_data?.phones || [],
        emails: quoteData.form_data?.emails || [],
      });
    }

    // Priority 1: If job number is provided, use it to fetch from Workiz
    if (jobNumber && jobNumber.trim()) {
      console.log(`[move-wt/load-job] Fetching job details for job number: ${jobNumber}`);

    // Call Workiz API to get all jobs
    const workizResponse = await fetch(WORKIZ_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!workizResponse.ok) {
      const errorText = await workizResponse.text();
      console.error('[move-wt/load-job] Workiz API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch job details from Workiz' },
        { status: 500 }
      );
    }

    const workizData = await workizResponse.json();

    // Find the job with matching SerialId
    const jobs = workizData.data || [];
    const job = jobs.find((j: any) => String(j.SerialId) === String(jobNumber));

    if (!job) {
      console.error(`[move-wt/load-job] Job ${jobNumber} not found in Workiz`);
      return NextResponse.json(
        { error: `Job ${jobNumber} not found` },
        { status: 404 }
      );
    }

    // Extract address from Workiz job data
    const addressParts = [];
    if (job.Address) addressParts.push(job.Address);
    if (job.City) addressParts.push(job.City);
    if (job.State) addressParts.push(job.State);
    if (job.Zip) addressParts.push(job.Zip);

    const address = addressParts.join(', ').trim() || job.FullAddress || '';

    if (!address) {
      console.error(`[move-wt/load-job] No address found for job ${jobNumber}`);
      return NextResponse.json(
        { error: 'Address not found for this job' },
        { status: 404 }
      );
    }

    console.log(`[move-wt/load-job] Found address: ${address}`);

    // Debug: Log all available fields from Workiz job
    console.log(`[move-wt/load-job] Workiz job fields:`, Object.keys(job));
    console.log(`[move-wt/load-job] Zip-related fields:`, {
      Zip: job.Zip,
      ZipCode: job.ZipCode,
      PostalCode: job.PostalCode,
      Zipcode: job.Zipcode,
    });

    // Extract customer information from Workiz
    // Try multiple possible zip code field names
    const zipCode = job.Zip || job.ZipCode || job.PostalCode || job.Zipcode || '';

    const customerInfo = {
      firstName: job.FirstName || '',
      lastName: job.LastName || '',
      phone: job.Phone || '',
      email: job.Email || '',
      pickupAddress: job.Address || '',
      pickupUnit: '',  // Not in Workiz by default
      pickupCity: job.City || '',
      pickupState: job.State || '',
      pickupZip: zipCode,
    };

    // Initialize Google Drive and find/create address folder
    let folderId: string;
    let folderUrl: string;

    try {
      const drive = await getDriveClient();
      folderId = await findOrCreateAddressFolder(drive, address);
      folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
      console.log(`[move-wt/load-job] Found/created folder: ${folderUrl}`);
    } catch (driveError) {
      console.error('[move-wt/load-job] Google Drive error:', driveError);
      return NextResponse.json(
        { error: 'Failed to find/create Google Drive folder', details: driveError instanceof Error ? driveError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Store job number, address, and folder URL in Supabase (upsert)
    const { error: picturesError } = await supabase
      .from('jobs_from_pictures')
      .upsert(
        {
          job_number: jobNumber,
          address: address,
          google_drive_folder_url: folderUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'job_number',
        }
      );

    if (picturesError) {
      console.error('[move-wt/load-job] Failed to store folder info in Supabase:', picturesError);
      // Continue anyway - we still have the folderUrl to return
    }

    // Check if there's existing form data for this job number first, then by address
    let existingFormData = null;

    // First try to find by job_number (legacy singular field)
    const { data: formByJobNumber } = await supabase
      .from('move_quote')
      .select('*')
      .eq('job_number', jobNumber)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (formByJobNumber) {
      existingFormData = formByJobNumber;
      console.log(`[move-wt/load-job] Found form data by job_number field:`, formByJobNumber.quote_number || 'no quote');
    } else {
      // Try job_numbers array field (newer format)
      const { data: formByJobNumbersArray } = await supabase
        .from('move_quote')
        .select('*')
        .contains('job_numbers', [jobNumber])
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (formByJobNumbersArray) {
        existingFormData = formByJobNumbersArray;
        console.log(`[move-wt/load-job] Found form data by job_numbers array:`, formByJobNumbersArray.quote_number || 'no quote');
      } else {
        // Fall back to searching by address
        const { data: formByAddress } = await supabase
          .from('move_quote')
          .select('*')
          .eq('address', address)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (formByAddress) {
          existingFormData = formByAddress;
          console.log(`[move-wt/load-job] Found form data by address:`, formByAddress.quote_number || 'no quote');
        }
      }
    }

    console.log(`[move-wt/load-job] Existing form data:`, existingFormData ? 'Found' : 'Not found');

    // Return success with all data
    return NextResponse.json({
      success: true,
      job_number: jobNumber,
      address: address,
      customerInfo: customerInfo,
      folderUrl: folderUrl,
      existingFormData: existingFormData?.form_data || null,
      quoteNumber: existingFormData?.quote_number || null,
    });
    }

    // Priority 2: If only phone number is provided, search both Workiz and Supabase
    if (phoneNumber && phoneNumber.trim()) {
      console.log(`[move-wt/load-job] Searching by phone number: ${phoneNumber}`);

      // Normalize the phone number for search
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      console.log(`[move-wt/load-job] Normalized phone: ${normalizedPhone}`);

      // Search Workiz for customer info
      const workizResponse = await fetch(WORKIZ_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      let customerInfo = null;
      if (workizResponse.ok) {
        const workizData = await workizResponse.json();
        const jobs = workizData.data || [];

        // Find job with matching phone number
        const job = jobs.find((j: any) => {
          const jobPhone = normalizePhoneNumber(j.Phone || '');
          return jobPhone === normalizedPhone;
        });

        if (job) {
          console.log(`[move-wt/load-job] Found customer in Workiz:`, job.FirstName, job.LastName);
          const zipCode = job.Zip || job.ZipCode || job.PostalCode || job.Zipcode || '';
          customerInfo = {
            firstName: job.FirstName || '',
            lastName: job.LastName || '',
            phone: job.Phone || '',
            email: job.Email || '',
            pickupAddress: job.Address || '',
            pickupUnit: '',
            pickupCity: job.City || '',
            pickupState: job.State || '',
            pickupZip: zipCode,
          };
        }
      }

      // Query Supabase for ALL form data matching this phone number
      const { data: formRecords, error: queryError } = await supabase
        .from('move_quote')
        .select('*')
        .eq('phone_number', normalizedPhone)
        .order('updated_at', { ascending: false });

      if (queryError) {
        console.error('[move-wt/load-job] Supabase query error:', queryError);
        return NextResponse.json(
          { error: 'Failed to search for phone number' },
          { status: 500 }
        );
      }

      console.log(`[move-wt/load-job] Found ${formRecords?.length || 0} saved form(s)`);

      // Debug: Log each record found
      if (formRecords && formRecords.length > 0) {
        formRecords.forEach((record: any, index: number) => {
          const formData = record.form_data || {};
          console.log(`[move-wt/load-job] Record ${index + 1}:`, {
            id: record.id,
            job_number: record.job_number,
            customer_home_address: record.customer_home_address,
            firstName: formData.firstName,
            lastName: formData.lastName,
            hasFormData: !!record.form_data,
            gunSafes: formData.gunSafes,
            pianos: formData.pianos,
          });
        });
      } else {
        console.log(`[move-wt/load-job] NO records found for phone: ${normalizedPhone}`);
      }

      // If only 1 record found, auto-load it directly
      if (formRecords && formRecords.length === 1) {
        const record = formRecords[0];
        const address = record.address || record.customer_home_address || '';
        console.log(`[move-wt/load-job] Auto-loading single record for address: ${address}`);

        // Try to find folder URL from jobs_from_pictures
        let folderUrl = '';
        const { data: pictureData } = await supabase
          .from('jobs_from_pictures')
          .select('google_drive_folder_url')
          .eq('address', address)
          .maybeSingle();

        if (pictureData) {
          folderUrl = pictureData.google_drive_folder_url || '';
        }

        return NextResponse.json({
          success: true,
          job_number: record.job_number || '',
          address: address,
          customerInfo: customerInfo,
          existingFormData: record.form_data || null,
          quoteNumber: record.quote_number || null,
          folderUrl: folderUrl,
        });
      }

      // If multiple records found, return for selection
      if (formRecords && formRecords.length > 1) {
        // Look up folder URLs for each form from jobs_from_pictures table
        const forms = await Promise.all(formRecords.map(async (record: any) => {
          const address = record.address || record.customer_home_address || 'No address';

          // Try to find folder URL from jobs_from_pictures
          let folderUrl = '';
          const { data: pictureData } = await supabase
            .from('jobs_from_pictures')
            .select('google_drive_folder_url')
            .eq('address', address)
            .maybeSingle();

          if (pictureData) {
            folderUrl = pictureData.google_drive_folder_url || '';
          }

          return {
            jobNumber: record.job_number || '',
            address: address,
            updatedAt: record.updated_at || '',
            formData: record.form_data || null,
            quoteNumber: record.quote_number || null,
            folderUrl: folderUrl,
          };
        }));

        return NextResponse.json({
          success: true,
          customerInfo: customerInfo,
          forms: forms,
          multiple: true,
        });
      }

      // No records found - return just customer info
      return NextResponse.json({
        success: true,
        customerInfo: customerInfo,
        forms: [],
        multiple: false,
      });
    }

  } catch (error) {
    console.error('[move-wt/load-job] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
