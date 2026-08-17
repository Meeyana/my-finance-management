import type { Config } from '@netlify/functions';
import { handleTelegramUpdate } from '../../functions/src/telegram-handler.js';
import type { TelegramUpdate } from '../../functions/src/telegram.js';
import { financeRuntimeConfig, initializeFinanceAdmin, requiredEnv } from './_runtime.mjs';

export default async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (request.headers.get('x-telegram-bot-api-secret-token') !== requiredEnv('TELEGRAM_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  initializeFinanceAdmin();
  try {
    const update = await request.json() as TelegramUpdate;
    await handleTelegramUpdate({
      ...financeRuntimeConfig(),
      accountHmacSecret: requiredEnv('ACCOUNT_HMAC_SECRET'),
    }, update);
    return new Response('ok');
  } catch (error) {
    console.error('Telegram update failed', error);
    return new Response('error', { status: 500 });
  }
};

export const config: Config = {
  path: '/api/finance/telegram',
};
