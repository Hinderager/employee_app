import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

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

// Get the existing Pictures folder - NEVER create or rename
async function getPicturesFolder(drive: any): Promise<string> {
  // First, try to use the known Pictures folder ID directly
  const knownPicturesFolderId = '1cDg6cjZR1ZaQL1EhxAi99e-wRNy-kL74';

  try {
    // Verify this folder exists and is accessible
    const folderCheck = await drive.files.get({
      fileId: knownPicturesFolderId,
      fields: 'id, name, mimeType, trashed',
    });

    if (folderCheck.data && !folderCheck.data.trashed) {
      console.log('[upload-media] Using known Pictures folder:', knownPicturesFolderId);
      return knownPicturesFolderId;
    }
  } catch (error: any) {
    console.log('[upload-media] Known folder ID not accessible:', error.message);
    console.log('[upload-media] Error code:', error.code);
  }

  // Debug: List ALL folders we CAN access
  console.log('[upload-media] Listing all accessible folders...');
  try {
    const allFoldersResponse = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, parents)',
      pageSize: 100,
    });
    console.log('[upload-media] Total accessible folders:', allFoldersResponse.data.files?.length);
    console.log('[upload-media] All accessible folders:', JSON.stringify(allFoldersResponse.data.files));
  } catch (error: any) {
    console.log('[upload-media] Could not list folders:', error.message);
  }

  // Fallback: Search for "Pictures" folder
  const searchResponse = await drive.files.list({
    q: `name='Pictures' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, parents)',
    pageSize: 100,
  });

  console.log('[upload-media] Search results for Pictures folder:', JSON.stringify(searchResponse.data.files));

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    // Prefer folder in root, otherwise use first result
    for (const file of searchResponse.data.files) {
      if (file.parents && file.parents.includes('root')) {
        console.log('[upload-media] Found Pictures folder in root via search:', file.id);
        return file.id!;
      }
    }
    const firstFile = searchResponse.data.files[0];
    if (firstFile.id) {
      console.log('[upload-media] Found Pictures folder via search:', firstFile.id);
      return firstFile.id;
    }
  }

  // If nothing found, throw error - do NOT create or rename anything
  console.error('[upload-media] Pictures folder not found or not accessible');
  throw new Error('Pictures folder not found in Google Drive. Please ensure the Pictures folder exists and is accessible with proper permissions.');
}

// Convert Buffer to Readable stream
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);
  return readable;
}

// Sanitize address string for use as folder name
function sanitizeAddressForFolderName(address: string): string {
  // Remove invalid characters for folder names: / \ : * ? " < > |
  // Also remove extra whitespace and trim
  return address
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const jobNumber = formData.get('jobNumber') as string;
    const loadNumber = formData.get('loadNumber') as string;
    const address = formData.get('address') as string;
    const files = formData.getAll('files') as File[];

    console.log('[upload-media] Received request:', {
      jobNumber,
      loadNumber,
      address,
      fileCount: files.length
    });

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Initialize Google Drive client (server-side authentication)
    const drive = await getDriveClient();

    // Get the existing Pictures folder (never create or rename)
    const picturesFolderId = await getPicturesFolder(drive);

    // Get or create "from employee app" subfolder inside Pictures
    const employeeAppFolderName = 'from employee app';
    const employeeAppSearchResponse = await drive.files.list({
      q: `name='${employeeAppFolderName}' and '${picturesFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, parents)',
      spaces: 'drive',
    });

    let employeeAppFolderId: string;
    if (employeeAppSearchResponse.data.files && employeeAppSearchResponse.data.files.length > 0) {
      const foundId = employeeAppSearchResponse.data.files[0].id;
      if (!foundId) {
        throw new Error('Failed to get employee app folder ID');
      }
      employeeAppFolderId = foundId;
      console.log('[upload-media] ✓ Using EXISTING \"from employee app\" folder:', employeeAppFolderId);
    } else {
      // Create "from employee app" folder
      const employeeAppFolderMetadata = {
        name: employeeAppFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [picturesFolderId],
      };
      const employeeAppFolder = await drive.files.create({
        requestBody: employeeAppFolderMetadata,
        fields: 'id',
      });
      const createdId = employeeAppFolder.data.id;
      if (!createdId) {
        throw new Error('Failed to create employee app folder');
      }
      employeeAppFolderId = createdId;
      console.log('[upload-media] ✓ CREATED \"from employee app\" folder:', employeeAppFolderId);
    }

    // Get or create "by address" subfolder inside "from employee app"
    const byAddressFolderName = 'by address';
    console.log('[upload-media] === SEARCHING FOR \"by address\" ===');
    console.log('[upload-media] Parent \"from employee app\" folder ID:', employeeAppFolderId);
    const byAddressSearchResponse = await drive.files.list({
      q: `name='${byAddressFolderName}' and '${employeeAppFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, parents)',
      spaces: 'drive',
    });

    let byAddressFolderId: string;
    if (byAddressSearchResponse.data.files && byAddressSearchResponse.data.files.length > 0) {
      const foundId = byAddressSearchResponse.data.files[0].id;
      if (!foundId) {
        throw new Error('Failed to get by address folder ID');
      }
      byAddressFolderId = foundId;
      console.log('[upload-media] ✓ Using EXISTING \"by address\" folder:', byAddressFolderId);
    } else {
      // Create "by address" folder
      const byAddressFolderMetadata = {
        name: byAddressFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [employeeAppFolderId],
      };
      const byAddressFolder = await drive.files.create({
        requestBody: byAddressFolderMetadata,
        fields: 'id',
      });
      const createdId = byAddressFolder.data.id;
      if (!createdId) {
        throw new Error('Failed to create by address folder');
      }
      byAddressFolderId = createdId;
      console.log('[upload-media] ✓ CREATED \"by address\" folder:', byAddressFolderId);
    }

    // Determine folder name based on address
    let targetFolderName: string;
    if (address && address.trim()) {
      // Use address as folder name (sanitized)
      targetFolderName = sanitizeAddressForFolderName(address);
      console.log('[upload-media] Using address-based folder:', targetFolderName);
    } else {
      // Use "General Media" folder for uploads without job/address
      targetFolderName = 'General Media';
      console.log('[upload-media] Using General Media folder');
    }

    // Search for existing folder with this name inside "by address" folder
    const folderSearchResponse = await drive.files.list({
      q: `name='${targetFolderName}' and '${byAddressFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    let targetFolderId: string;
    if (folderSearchResponse.data.files && folderSearchResponse.data.files.length > 0) {
      // Folder exists, use it
      const foundId = folderSearchResponse.data.files[0].id;
      if (!foundId) {
        throw new Error('Failed to get target folder ID');
      }
      targetFolderId = foundId;
      console.log('[upload-media] Found existing folder:', targetFolderName);
    } else {
      // Create new folder inside "by address"
      const folderMetadata = {
        name: targetFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [byAddressFolderId],
      };

      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      const createdId = folder.data.id;
      if (!createdId) {
        throw new Error('Failed to create target folder');
      }
      targetFolderId = createdId;
      console.log('[upload-media] Created new folder:', targetFolderName);
    }

    // Upload each file
    const uploadedFiles = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = bufferToStream(buffer);

      const fileMetadata = {
        name: file.name,
        parents: [targetFolderId],
      };

      const media = {
        mimeType: file.type,
        body: stream,
      };

      const uploadedFile = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      uploadedFiles.push({
        id: uploadedFile.data.id,
        name: uploadedFile.data.name,
        link: uploadedFile.data.webViewLink,
      });
    }

    console.log('[upload-media] === FINAL FOLDER HIERARCHY ===');
    console.log('[upload-media] Pictures:', picturesFolderId);
    console.log('[upload-media]   → from employee app:', employeeAppFolderId);
    console.log('[upload-media]     → by address:', byAddressFolderId);
    console.log('[upload-media]       → address folder (' + targetFolderName + '):', targetFolderId);
    console.log(`[upload-media] Successfully uploaded ${uploadedFiles.length} files to folder: ${targetFolderName}`);

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedFiles.length,
      files: uploadedFiles,
      folderId: targetFolderId,
      folderName: targetFolderName,
      message: `Successfully uploaded ${uploadedFiles.length} file(s) to Google Drive`,
    });

  } catch (error: any) {
    console.error('[upload-media] Error uploading to Google Drive:', error);

    return NextResponse.json(
      {
        error: 'Failed to upload files to Google Drive',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
