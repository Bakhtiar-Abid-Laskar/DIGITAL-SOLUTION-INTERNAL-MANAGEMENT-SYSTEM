import { createServer } from 'http';
import { parse } from 'url';
import { exec } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log('\n=============================================');
  console.log('   Google Drive OAuth 2.0 Token Generator    ');
  console.log('=============================================\n');
  console.log('This script will help you generate a long-lived Refresh Token');
  console.log('so your Supabase Edge Functions can upload to your Google Drive.\n');

  const clientId = await question('1. Enter your Google Client ID: ');
  const clientSecret = await question('2. Enter your Google Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('Client ID and Secret are required.');
    process.exit(1);
  }

  const redirectUri = 'http://localhost:3000/oauth2callback';
  const scope = 'https://www.googleapis.com/auth/drive';
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  console.log('\n---------------------------------------------');
  console.log('3. Please open this URL in your browser:');
  console.log(authUrl);
  console.log('---------------------------------------------\n');
  console.log('Waiting for authorization...\n');

  // Start local server to catch redirect
  const server = createServer(async (req, res) => {
    const urlObj = parse(req.url, true);
    
    if (urlObj.pathname === '/oauth2callback') {
      const code = urlObj.query.code;
      
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization successful!</h1><p>You can close this tab and return to the terminal.</p>');
        server.close();

        console.log('Authorization code received! Fetching refresh token...\n');
        
        try {
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              code: code,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code'
            })
          });

          const data = await response.json();

          if (data.error) {
            console.error('Error fetching token:', data);
          } else {
            console.log('=============================================');
            console.log('                SUCCESS!                     ');
            console.log('=============================================');
            console.log('\nRun the following commands in your Supabase project folder:');
            console.log('\n1. Set Client ID:');
            console.log(`npx supabase secrets set GOOGLE_CLIENT_ID="${clientId}"`);
            console.log('\n2. Set Client Secret:');
            console.log(`npx supabase secrets set GOOGLE_CLIENT_SECRET="${clientSecret}"`);
            console.log('\n3. Set Refresh Token:');
            console.log(`npx supabase secrets set GOOGLE_REFRESH_TOKEN="${data.refresh_token}"`);
            console.log('\n4. Finally, redeploy your functions:');
            console.log('npx supabase functions deploy');
            console.log('\n=============================================');
          }
        } catch (error) {
          console.error('Error:', error);
        }
        setTimeout(() => process.exit(0), 1000); // Wait 1s for console to flush
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No code found in URL');
      }
    }
  });

  server.listen(3000, () => {
    // Attempt to automatically open the browser
    const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${startCmd} "${authUrl}"`, () => {});
  });
}

main();
