#!/usr/bin/env node
/**
 * get-google-refresh-token.mjs
 *
 * ONE-TIME script. Run once locally to generate a Google OAuth refresh token.
 * Never deploy this file. The refresh token it prints goes into Supabase secrets.
 *
 * Prerequisites:
 *   node >= 18
 *   npm install open   (or just open the URL manually)
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=<your-client-id> \
 *   GOOGLE_CLIENT_SECRET=<your-client-secret> \
 *   node scripts/get-google-refresh-token.mjs
 *
 * Then set Supabase secrets:
 *   npx supabase secrets set GOOGLE_CLIENT_ID=<id>
 *   npx supabase secrets set GOOGLE_CLIENT_SECRET=<secret>
 *   npx supabase secrets set GOOGLE_REFRESH_TOKEN=<token printed below>
 */

import http from 'node:http';
import { createInterface } from 'node:readline';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as env vars before running.');
  process.exit(1);
}

// Scope: drive.file — only access files/folders this app creates. Safer than full drive scope.
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const REDIRECT_URI = 'http://localhost:9876';

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;          // force consent so Google always returns a refresh token

console.log('\n=== Google OAuth — One-Time Refresh Token Generator ===\n');
console.log('1. Open this URL in your browser (as the Gmail account that will own Drive files):');
console.log('\n' + authUrl + '\n');
console.log('2. Authorize the app. You will be redirected to http://localhost:9876/?code=...');
console.log('3. Waiting for the redirect on port 9876...\n');

// Start a one-shot local server to catch the redirect
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.end('<h2>Authorization failed: ' + error + '</h2>');
    console.error('Authorization failed:', error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.end('<h2>No code received. Try again.</h2>');
    return;
  }

  res.end('<h2>Authorization successful! You can close this tab.</h2>');

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
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

  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    console.error('\nERROR: No refresh_token in response. Did you revoke app access and try again?');
    console.error('Response:', JSON.stringify(tokens, null, 2));
    server.close();
    process.exit(1);
  }

  console.log('=== SUCCESS ===\n');
  console.log('REFRESH TOKEN (copy this into Supabase secrets as GOOGLE_REFRESH_TOKEN):');
  console.log('\n' + tokens.refresh_token + '\n');
  console.log('Do NOT commit this token. Run:');
  console.log('  npx supabase secrets set GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
  console.log('\nAccess token expires in:', tokens.expires_in, 'seconds (not needed — only the refresh token matters)');

  server.close();
});

server.listen(9876, async () => {
  // Optionally auto-open if the 'open' package is available
  try {
    const { default: open } = await import('open');
    open(authUrl);
  } catch {
    // 'open' not installed — user opens manually (already printed above)
  }
});

server.on('error', (err) => {
  console.error('Could not start local server on port 9876:', err.message);
  console.log('Please open the URL above manually and paste the authorization code here:');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Paste full redirect URL (http://localhost:9876/?code=...): ', async (input) => {
    rl.close();
    const url = new URL(input.trim());
    const code = url.searchParams.get('code');
    if (!code) { console.error('No code found in URL.'); process.exit(1); }
    // Re-run exchange logic (duplicated for fallback)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.refresh_token) { console.error('No refresh_token received:', tokens); process.exit(1); }
    console.log('\nREFRESH TOKEN:\n' + tokens.refresh_token);
  });
});
