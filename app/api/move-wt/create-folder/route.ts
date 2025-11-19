import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  console.log('[move-wt/create-folder] Searching for address folder:', address);

  const targetFolderName = sanitizeAddressForFolderName(address);
  console.log('[move-wt/create-folder] Sanitized folder name:', targetFolderName);

  // Escape single quotes in folder name for Google Drive query (single quotes must be escaped with backslash)
  const escapedFolderName = targetFolderName.replace(/'/g, "\\'");

  // Search for existing folder with this address name in the "by address" folder
  const folderSearchResponse = await drive.files.list({
    q: `name='${escapedFolderName}' and '${byAddressFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, parents)',
    pageSize: 100, // Increased to check more folders
  });

  console.log('[move-wt/create-folder] Search returned', folderSearchResponse.data.files?.length || 0, 'folders');

  // If folder exists, use it
  if (folderSearchResponse.data.files && folderSearchResponse.data.files.length > 0) {
    // Check for exact match (case-insensitive)
    const exactMatch = folderSearchResponse.data.files.find(
      (file: any) => file.name.toLowerCase() === targetFolderName.toLowerCase()
    );

    if (exactMatch) {
      console.log('[move-wt/create-folder] Found existing address folder:', exactMatch.id, '- Name:', exactMatch.name);
      return exactMatch.id!;
    }

    // If no exact match but files were returned, log warning
    console.log('[move-wt/create-folder] WARNING: Found folders but no exact match. Using first folder:', folderSearchResponse.data.files[0].name);
    return folderSearchResponse.data.files[0].id!;
  }

  // Folder doesn't exist - create it in the "by address" folder
  console.log('[move-wt/create-folder] Address folder not found, creating new one in "by address" folder...');
  console.log('[move-wt/create-folder] Creating folder with name:', targetFolderName);

  const folderMetadata = {
    name: targetFolderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [byAddressFolderId],
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id, name',
  });

  console.log('[move-wt/create-folder] Created new address folder:', folder.data.id, '- Name:', folder.data.name);
  return folder.data.id!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, jobNumber } = body;

    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    console.log(`[move-wt/create-folder] Creating folder for address: ${address}`);

    // Initialize Google Drive and find/create address folder
    let folderId: string;
    let folderUrl: string;

    try {
      const drive = await getDriveClient();
      folderId = await findOrCreateAddressFolder(drive, address);
      folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
      console.log(`[move-wt/create-folder] Found/created folder: ${folderUrl}`);
    } catch (driveError) {
      console.error('[move-wt/create-folder] Google Drive error:', driveError);
      return NextResponse.json(
        { error: 'Failed to find/create Google Drive folder', details: driveError instanceof Error ? driveError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // If job number is provided, store in jobs_from_pictures table
    if (jobNumber && jobNumber.trim()) {
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
        console.error('[move-wt/create-folder] Failed to store folder info in Supabase:', picturesError);
        // Continue anyway - we still have the folderUrl to return
      }
    }

    return NextResponse.json({
      success: true,
      address: address,
      folderUrl: folderUrl,
      folderId: folderId,
    });

  } catch (error) {
    console.error('[move-wt/create-folder] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
