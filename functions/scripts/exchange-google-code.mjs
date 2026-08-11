const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const code = process.env.GOOGLE_AUTH_CODE;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/oauth/callback';

if (!clientId || !clientSecret || !code) {
  throw new Error('Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_AUTH_CODE.');
}

const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }),
});
const result = await response.json();
if (!response.ok) throw new Error(JSON.stringify(result));

console.log('Refresh token (store immediately in Firebase Secret Manager):');
console.log(result.refresh_token || 'No refresh token returned. Revoke consent and retry with prompt=consent.');
