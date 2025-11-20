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

  console.log('[load-job] Searching for address folder:', address);

  const targetFolderName = sanitizeAddressForFolderName(address);

  // Search for existing folder with this address name in the "by address" folder
  const folderSearchResponse = await drive.files.list({
    q: `name='${targetFolderName}' and '${byAddressFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, parents)',
    pageSize: 10,
  });

  // If folder exists, use it
  if (folderSearchResponse.data.files && folderSearchResponse.data.files.length > 0) {
    const existingFolder = folderSearchResponse.data.files[0];
    console.log('[load-job] Found existing address folder:', existingFolder.id);
    return existingFolder.id!;
  }

  // Folder doesn't exist - create it in the "by address" folder
  console.log('[load-job] Address folder not found, creating new one in "by address" folder...');
  const folderMetadata = {
    name: targetFolderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [byAddressFolderId],
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  console.log('[load-job] Created new address folder:', folder.data.id);
  return folder.data.id!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobNumber, phoneNumber, includeCompletedJobs } = body;

    // Require at least one parameter
    if ((!jobNumber || !jobNumber.trim()) && (!phoneNumber || !phoneNumber.trim())) {
      return NextResponse.json(
        { error: 'Either job number or phone number is required' },
        { status: 400 }
      );
    }

    // Priority 1: If job number is provided, use it to fetch from Workiz
    if (jobNumber && jobNumber.trim()) {
      console.log(`[load-job] Fetching address for job: ${jobNumber}`);

    // Call Workiz API directly to get all jobs
    const workizResponse = await fetch(WORKIZ_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!workizResponse.ok) {
      const errorText = await workizResponse.text();
      console.error('[load-job] Workiz API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch job details from Workiz' },
        { status: 500 }
      );
    }

    const workizData = await workizResponse.json();

    // Filter jobs by status if needed
    let jobs = workizData.data || [];

    // If not including completed jobs, filter out Done, Canceled, and Done pending approval statuses
    if (!includeCompletedJobs) {
      const excludedStatuses = ['Done', 'Canceled', 'Done pending approval'];
      jobs = jobs.filter((j: any) => !excludedStatuses.includes(j.Status));
      console.log(`[load-job] Filtered to ${jobs.length} active jobs (excluding Done, Canceled, Done pending approval)`);
    } else {
      console.log(`[load-job] Including all ${jobs.length} jobs (all statuses)`);
    }

    // Find the job with matching SerialId
    const job = jobs.find((j: any) => String(j.SerialId) === String(jobNumber));

    if (!job) {
      console.error(`[load-job] Job ${jobNumber} not found in Workiz`);
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
      console.error(`[load-job] No address found for job ${jobNumber}`);
      return NextResponse.json(
        { error: 'Address not found for this job' },
        { status: 404 }
      );
    }

    console.log(`[load-job] Found address: ${address}`);

    // Initialize Google Drive and find/create address folder
    let folderId: string;
    let folderUrl: string;

    try {
      const drive = await getDriveClient();
      folderId = await findOrCreateAddressFolder(drive, address);
      folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
      console.log(`[load-job] Found/created folder: ${folderUrl}`);
    } catch (driveError) {
      console.error('[load-job] Google Drive error:', driveError);
      return NextResponse.json(
        { error: 'Failed to find/create Google Drive folder', details: driveError instanceof Error ? driveError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Store job number, address, and folder URL in Supabase (upsert)
    const { data, error } = await supabase
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
      )
      .select('job_number, address, google_drive_folder_url, updated_at');

    if (error) {
      console.error('[load-job] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to store job information' },
        { status: 500 }
      );
    }

    console.log(`[load-job] Stored in Supabase:`, data);

    return NextResponse.json({
      success: true,
      job_number: jobNumber,
      address: address,
      folderUrl: folderUrl,
      folderId: folderId,
    });
    }

    // Priority 2: If only phone number is provided, search Workiz and Supabase
    if (phoneNumber && phoneNumber.trim()) {
      console.log(`[load-job] Searching by phone number: ${phoneNumber}`);

      // Normalize the phone number for search
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      console.log(`[load-job] Normalized phone: ${normalizedPhone}`);

      // Search Workiz for jobs with this phone number
      const workizResponse = await fetch(WORKIZ_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!workizResponse.ok) {
        const errorText = await workizResponse.text();
        console.error('[load-job] Workiz API error:', errorText);
        return NextResponse.json(
          { error: 'Failed to fetch job details from Workiz' },
          { status: 500 }
        );
      }

      const workizData = await workizResponse.json();

      // Filter jobs by status if needed
      let jobs = workizData.data || [];

      // If not including completed jobs, filter out Done, Canceled, and Done pending approval statuses
      if (!includeCompletedJobs) {
        const excludedStatuses = ['Done', 'Canceled', 'Done pending approval'];
        jobs = jobs.filter((j: any) => !excludedStatuses.includes(j.Status));
        console.log(`[load-job] Filtered to ${jobs.length} active jobs (excluding Done, Canceled, Done pending approval)`);
      } else {
        console.log(`[load-job] Including all ${jobs.length} jobs (all statuses)`);
      }

      // Find all jobs with matching phone number
      const matchingJobs = jobs.filter((j: any) => {
        const jobPhone = normalizePhoneNumber(j.Phone || '');
        return jobPhone === normalizedPhone;
      });

      if (matchingJobs.length === 0) {
        console.log(`[load-job] No jobs found for phone number ${phoneNumber}`);
        return NextResponse.json(
          { error: 'No jobs found for this phone number' },
          { status: 404 }
        );
      }

      console.log(`[load-job] Found ${matchingJobs.length} job(s) for phone number`);

      // If only one job found, load it directly
      if (matchingJobs.length === 1) {
        const job = matchingJobs[0];

        // Extract address from Workiz job data
        const addressParts = [];
        if (job.Address) addressParts.push(job.Address);
        if (job.City) addressParts.push(job.City);
        if (job.State) addressParts.push(job.State);
        if (job.Zip) addressParts.push(job.Zip);

        const address = addressParts.join(', ').trim() || job.FullAddress || '';

        if (!address) {
          console.error(`[load-job] No address found for job ${job.SerialId}`);
          return NextResponse.json(
            { error: 'Address not found for this job' },
            { status: 404 }
          );
        }

        console.log(`[load-job] Found address: ${address}`);

        // Initialize Google Drive and find/create address folder
        let folderId: string;
        let folderUrl: string;

        try {
          const drive = await getDriveClient();
          folderId = await findOrCreateAddressFolder(drive, address);
          folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
          console.log(`[load-job] Found/created folder: ${folderUrl}`);
        } catch (driveError) {
          console.error('[load-job] Google Drive error:', driveError);
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
              job_number: job.SerialId,
              address: address,
              google_drive_folder_url: folderUrl,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'job_number',
            }
          );

        if (picturesError) {
          console.error('[load-job] Failed to store folder info in Supabase:', picturesError);
          // Continue anyway - we still have the folderUrl to return
        }

        return NextResponse.json({
          success: true,
          job_number: job.SerialId,
          address: address,
          folderUrl: folderUrl,
          folderId: folderId,
        });
      }

      // Multiple jobs found - return them for user selection
      const forms = await Promise.all(matchingJobs.map(async (job: any) => {
        const addressParts = [];
        if (job.Address) addressParts.push(job.Address);
        if (job.City) addressParts.push(job.City);
        if (job.State) addressParts.push(job.State);
        if (job.Zip) addressParts.push(job.Zip);

        const address = addressParts.join(', ').trim() || job.FullAddress || 'No address';

        // Try to find folder URL from jobs_from_pictures
        let folderUrl = '';
        const { data: pictureData } = await supabase
          .from('jobs_from_pictures')
          .select('google_drive_folder_url')
          .eq('job_number', job.SerialId)
          .maybeSingle();

        if (pictureData) {
          folderUrl = pictureData.google_drive_folder_url || '';
        }

        return {
          jobNumber: job.SerialId || '',
          address: address,
          updatedAt: job.UpdatedDate || new Date().toISOString(),
          folderUrl: folderUrl,
        };
      }));

      return NextResponse.json({
        success: true,
        forms: forms,
        multiple: true,
      });
    }

  } catch (error) {
    console.error('[load-job] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
