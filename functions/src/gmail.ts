import type { GmailMessage } from './types.js';

interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

async function googleRequest<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Gmail API ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export async function getAccessToken(credentials: OAuthCredentials): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = await response.json() as TokenResponse;
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || `OAuth token request failed (${response.status})`);
  }
  return body.access_token;
}

export async function listGmailMessageIds(accessToken: string, query: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ q: query, maxResults: '100' });
    if (pageToken) params.set('pageToken', pageToken);
    const result = await googleRequest<{
      messages?: Array<{ id: string }>;
      nextPageToken?: string;
    }>(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, accessToken);
    ids.push(...(result.messages || []).map((message) => message.id));
    pageToken = result.nextPageToken;
  } while (pageToken && ids.length < 500);

  return ids;
}

export async function getGmailMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
  const params = new URLSearchParams({ format: 'full' });
  return googleRequest<GmailMessage>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?${params}`,
    accessToken,
  );
}
