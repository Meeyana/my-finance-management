import { timingSafeEqual } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function matchesSecret(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function initializeFinanceAdmin(): void {
  if (getApps().length) return;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    });
    return;
  }

  initializeApp({
    credential: cert({
      projectId: requiredEnv('FIREBASE_ADMIN_PROJECT_ID'),
      clientEmail: requiredEnv('FIREBASE_ADMIN_CLIENT_EMAIL'),
      privateKey: requiredEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });
}

export function financeRuntimeConfig() {
  return {
    uid: requiredEnv('AUTOMATION_USER_ID'),
    botToken: requiredEnv('TELEGRAM_BOT_TOKEN'),
    chatId: requiredEnv('TELEGRAM_CHAT_ID'),
  };
}

export function automationEnabled(): boolean {
  return process.env.FINANCE_AUTOMATION_ENABLED === 'true';
}
