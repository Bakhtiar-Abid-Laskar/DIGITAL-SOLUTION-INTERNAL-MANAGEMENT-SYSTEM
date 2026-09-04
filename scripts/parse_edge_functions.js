const fs = require('fs');
const path = require('path');

const functionsDir = 'supabase/functions';
const list = fs.readdirSync(functionsDir, { withFileTypes: true });

const results = [];

list.forEach(item => {
  if (item.isDirectory() && item.name !== '_shared') {
    const indexPath = path.join(functionsDir, item.name, 'index.ts');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      const lines = content.split('\n');
      
      // Check auth checks
      const hasAuthHeader = content.includes('Authorization') || content.includes('req.headers.get');
      const hasGetUser = content.includes('auth.getUser');
      const hasServiceRole = content.includes('SUPABASE_SERVICE_ROLE_KEY');
      const hasTwilio = content.includes('TWILIO');
      const hasResend = content.includes('RESEND');
      const hasDrive = content.includes('driveUpload') || content.includes('googleAuth') || content.includes('GOOGLE');

      results.push({
        name: item.name,
        lineCount: lines.length,
        hasAuthHeader,
        hasGetUser,
        hasServiceRole,
        hasTwilio,
        hasResend,
        hasDrive,
        firstFewLines: lines.slice(0, 15).join('\n')
      });
    }
  }
});

console.log(JSON.stringify(results, null, 2));
