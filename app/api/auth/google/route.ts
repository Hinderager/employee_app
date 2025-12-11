import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production'
    ? process.env.GOOGLE_REDIRECT_URI
    : 'http://localhost:3001/api/auth/google/callback'
);

export async function GET() {
  try {
    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: [
        'https://www.googleapis.com/auth/drive', // Access to create and manage files
        'https://www.googleapis.com/auth/spreadsheets', // Access to read/write spreadsheets
      ],
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return NextResponse.json({ authUrl });

  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
