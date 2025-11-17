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

// Find or create the "Pictures" folder in Google Drive
async function getOrCreatePicturesFolder(drive: any) {
  const folderName = 'Pictures';

  // Search for existing Pictures folder
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // Create Pictures folder if it doesn't exist
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  return folder.data.id;
}

// Convert Buffer to Readable stream
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);
  return readable;
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const jobNumber = formData.get('jobNumber') as string;
    const loadNumber = formData.get('loadNumber') as string;
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Initialize Google Drive client (server-side authentication)
    const drive = await getDriveClient();

    // Get or create Pictures folder
    const picturesFolderId = await getOrCreatePicturesFolder(drive);

    // Create subfolder for this upload
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);

    let jobFolderName: string;
    if (jobNumber && loadNumber) {
      jobFolderName = `Job_${jobNumber}_Load_${loadNumber}`;
    } else if (jobNumber) {
      jobFolderName = `Job_${jobNumber}`;
    } else {
      // If no job number, use timestamp
      jobFolderName = `General_${timestamp}`;
    }

    const jobFolderMetadata = {
      name: jobFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [picturesFolderId],
    };

    const jobFolder = await drive.files.create({
      requestBody: jobFolderMetadata,
      fields: 'id',
    });

    const jobFolderId = jobFolder.data.id;

    // Upload each file
    const uploadedFiles = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = bufferToStream(buffer);

      const fileMetadata = {
        name: file.name,
        parents: [jobFolderId],
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

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedFiles.length,
      files: uploadedFiles,
      folderId: jobFolderId,
      message: `Successfully uploaded ${uploadedFiles.length} file(s) to Google Drive`,
    });

  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error);

    return NextResponse.json(
      {
        error: 'Failed to upload files to Google Drive',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
