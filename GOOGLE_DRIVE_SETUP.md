# Google Drive API Setup Guide

This guide will help you set up Google Drive API integration for uploading media files from the Employee App.

## Overview

The app uploads media files to Google Drive at:
- **Main Folder**: `My Drive > Pictures`
- **Subfolders**: `Job_{jobNumber}` or `Job_{jobNumber}_Load_{loadNumber}`

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it: "Employee App Media Upload"
4. Click "Create"

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on it and click **Enable**

## Step 3: Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **Service Account**
3. Fill in the details:
   - **Service account name**: `employee-app-drive-uploader`
   - **Service account ID**: (auto-generated)
   - **Description**: "Service account for uploading employee media to Google Drive"
4. Click **Create and Continue**
5. Skip the optional "Grant this service account access to project" section (click **Continue**)
6. Skip the optional "Grant users access to this service account" section (click **Done**)

## Step 4: Create and Download Service Account Key

1. In the **Credentials** page, find your newly created service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format
6. Click **Create**
7. The JSON key file will download automatically
8. **IMPORTANT**: Keep this file secure! It contains sensitive credentials

## Step 5: Share Your Google Drive Folder with the Service Account

1. Open your Google Drive at [drive.google.com](https://drive.google.com/)
2. Navigate to **My Drive**
3. Find or create the **Pictures** folder
4. Right-click the **Pictures** folder → **Share**
5. Copy the service account email from the downloaded JSON file (looks like: `employee-app-drive-uploader@project-id.iam.gserviceaccount.com`)
6. Paste it into the "Add people" field
7. Set permission to **Editor**
8. Uncheck "Notify people" (it's a service account, not a person)
9. Click **Share**

## Step 6: Add Credentials to .env.local

1. Open the downloaded JSON file
2. Copy the entire content
3. Open `.env.local` in your Employee App directory
4. Add this line:
   ```
   GOOGLE_DRIVE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
   ```
5. Replace the JSON placeholder with your actual service account JSON (keep it all on one line, within single quotes)
6. Save the file

## Step 7: Restart Your Development Server

1. Stop the Next.js dev server (Ctrl+C)
2. Start it again: `npm run dev`
3. The app will now be able to upload files to Google Drive!

## Testing

1. Navigate to **Pictures** → **General Media** in the app
2. Enter a job number
3. Take or upload a photo/video
4. Click "Upload to Google Drive"
5. Check your Google Drive **Pictures** folder for the uploaded files

## Folder Structure in Google Drive

```
My Drive/
└── Pictures/
    ├── Job_12345/
    │   ├── photo1.jpg
    │   └── video1.mp4
    └── Job_12346_Load_2/
        ├── photo2.jpg
        └── photo3.jpg
```

## Troubleshooting

### "GOOGLE_DRIVE_CREDENTIALS not configured"
- Make sure you added the credentials to `.env.local`
- Restart your dev server after adding credentials

### "Failed to upload files to Google Drive"
- Check that the service account has Editor access to the Pictures folder
- Verify the JSON credentials are valid
- Check the browser console for detailed error messages

### "Permission denied"
- The service account email must have Editor permissions on the Pictures folder
- Make sure you shared the folder with the exact service account email

## Security Notes

- **NEVER commit .env.local to version control**
- Keep your service account JSON file secure
- The service account only has access to folders explicitly shared with it
- Rotate credentials periodically for security

## Support

For additional help:
1. Check the [Google Drive API documentation](https://developers.google.com/drive/api/guides/about-sdk)
2. Review error messages in the browser console
3. Check the Next.js server logs
