import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// This is a one-time setup endpoint to get your refresh token
// Visit http://localhost:3001/api/setup-google-drive to authenticate

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NODE_ENV === 'production'
      ? process.env.GOOGLE_REDIRECT_URI
      : 'http://localhost:3001/api/setup-google-drive'
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    // If we have a code, exchange it for tokens
    if (code) {
      const oauth2Client = getOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);

      // Return the refresh token to the user
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Drive Setup Complete</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                color: #06649b;
              }
              .token-box {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                border: 1px solid #dee2e6;
                margin: 20px 0;
                font-family: monospace;
                word-break: break-all;
              }
              .success {
                color: #28a745;
                font-weight: bold;
              }
              .instructions {
                background: #fff3cd;
                padding: 15px;
                border-radius: 4px;
                border: 1px solid #ffc107;
                margin: 20px 0;
              }
              code {
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✓ Google Drive Setup Complete</h1>
              <p class="success">Successfully authenticated with Google!</p>

              <div class="instructions">
                <h3>Next Steps:</h3>
                <ol>
                  <li>Copy the refresh token below</li>
                  <li>Open your <code>.env.local</code> file</li>
                  <li>Add this line: <code>GOOGLE_REFRESH_TOKEN="your_token_here"</code></li>
                  <li>Restart your development server</li>
                </ol>
              </div>

              <h3>Your Refresh Token:</h3>
              <div class="token-box">
                ${tokens.refresh_token || 'No refresh token received. You may need to revoke access in Google and try again.'}
              </div>

              <p><strong>Important:</strong> Keep this token secure! Add it to your .env.local file and never commit it to version control.</p>
            </div>
          </body>
        </html>
        `,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }

    // No code, so generate authorization URL
    const oauth2Client = getOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent', // Force consent to ensure we get a refresh token
    });

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('Setup error:', error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Setup Error</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .error {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              color: #dc3545;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Setup Error</h1>
            <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
            <p><a href="/api/setup-google-drive">Try again</a></p>
          </div>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
}
