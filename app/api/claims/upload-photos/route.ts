import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Claims photos folder in Google Drive
const CLAIMS_FOLDER_ID = "1aDVWwz_DFbLiImO-3FB_LAML7OKXUjiL"; // Pictures folder - will create subfolder

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  folderName: string
): Promise<string> {
  // Search for existing folder
  const search = await drive.files.list({
    q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });

  if (search.data.files && search.data.files.length > 0) {
    return search.data.files[0].id!;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return folder.data.id!;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const claimNumber = formData.get("claimNumber") as string;
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    // Set up Google Drive API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // Refresh the access token
    await oauth2Client.getAccessToken();

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Create Claims folder structure: Pictures > Claims Photos > [CLM-XXXX]
    const claimsParentFolderId = await getOrCreateFolder(drive, CLAIMS_FOLDER_ID, "Claims Photos");
    const claimFolderId = await getOrCreateFolder(drive, claimsParentFolderId, claimNumber || "Uncategorized");

    const photoUrls: string[] = [];

    // Upload each file
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = bufferToStream(buffer);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `${claimNumber}_${timestamp}_${file.name}`;

      const uploadedFile = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [claimFolderId],
        },
        media: {
          mimeType: file.type,
          body: stream,
        },
        fields: "id, name, webViewLink, webContentLink",
      });

      if (uploadedFile.data.webViewLink) {
        photoUrls.push(uploadedFile.data.webViewLink);
      }
    }

    // Get folder URL
    const folderUrl = `https://drive.google.com/drive/folders/${claimFolderId}`;

    console.log("[upload-photos] Uploaded", files.length, "photos for claim", claimNumber);

    return NextResponse.json({
      success: true,
      photoUrls,
      folderUrl,
      folderId: claimFolderId,
    });
  } catch (error) {
    console.error("[upload-photos] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload photos" },
      { status: 500 }
    );
  }
}
