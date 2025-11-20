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
    const { jobNumber, phoneNumber } = body;

    // Require at least one parameter
    if ((!jobNumber || !jobNumber.trim()) && (!phoneNumber || !phoneNumber.trim())) {
      return NextResponse.json(
        { error: 'Either job number or phone number is required' },
        { status: 400 }
      );
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

    // Check if there's existing form data for this address
    const { data: existingFormData } = await supabase
      .from('move_quote')
      .select('*')
      .eq('address', address)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

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

      // Format forms for selection
      const forms = (formRecords || []).map((record: any) => ({
        jobNumber: record.job_number || '',
        address: record.address || 'No address',
        updatedAt: record.updated_at || '',
        formData: record.form_data || null,
        quoteNumber: record.quote_number || null,
      }));

      // Return customer info and all forms
      return NextResponse.json({
        success: true,
        customerInfo: customerInfo,
        forms: forms,
        multiple: forms.length > 1,
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
