const clientId = process.env.GOOGLE_CLIENT_ID;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/oauth/callback';

if (!clientId) throw new Error('Set GOOGLE_CLIENT_ID before running this script.');

const params = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  access_type: 'offline',
  prompt: 'consent',
  include_granted_scopes: 'true',
  scope: 'https://www.googleapis.com/auth/gmail.readonly',
});

console.log(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
