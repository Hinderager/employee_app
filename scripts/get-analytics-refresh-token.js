// Script to get a new refresh token with Analytics and Search Console scopes
// Run: node scripts/get-analytics-refresh-token.js

const http = require('http');
const { URL } = require('url');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3099/callback';

// Scopes needed for Analytics Dashboard
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',      // GA4 Data API
  'https://www.googleapis.com/auth/webmasters.readonly',     // Search Console API
  'https://www.googleapis.com/auth/drive.file',              // Google Drive (keep existing)
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local');
  process.exit(1);
}

// Build authorization URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token

console.log('\n=== Google OAuth - Analytics Dashboard Setup ===\n');
console.log('This will request permissions for:');
console.log('  - Google Analytics 4 (read-only)');
console.log('  - Google Search Console (read-only)');
console.log('  - Google Drive (for media uploads)');
console.log('\n1. Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\n2. Sign in and grant permissions');
console.log('3. You will be redirected back here\n');

// Start local server to receive callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3099');

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Error: ' + error + '</h1><p>Please try again.</p>');
      console.error('Authorization error:', error);
      server.close();
      return;
    }

    if (code) {
      // Exchange code for tokens
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          }),
        });

        const tokens = await tokenResponse.json();

        if (tokens.refresh_token) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Success!</h1><p>Your new refresh token has been generated.</p><p>Check the terminal for the token value.</p><p>You can close this window.</p>');

          console.log('\n=== SUCCESS! ===\n');
          console.log('New refresh token (with Analytics + Search Console scopes):');
          console.log('\n' + tokens.refresh_token + '\n');
          console.log('\nUpdate your .env.local file:');
          console.log('GOOGLE_REFRESH_TOKEN="' + tokens.refresh_token + '"');
          console.log('\n');
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Error</h1><p>No refresh token received. Error: ' + (tokens.error || 'unknown') + '</p>');
          console.error('No refresh token in response:', tokens);
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><pre>' + err.message + '</pre>');
        console.error('Token exchange error:', err);
      }

      server.close();
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3099, () => {
  console.log('Waiting for OAuth callback on http://localhost:3099/callback ...\n');
});
