import type { Config } from '@netlify/functions';
import { getAccessToken, getGmailMessage, listGmailMessageIds } from '../../functions/src/gmail.js';
import { parseVietnameseFinanceEmail } from '../../functions/src/parser.js';
import {
  findTrackedAccount,
  hasProcessedEmail,
  listUnnotifiedPendingTransactions,
  markTelegramNotified,
  recordSkippedEmail,
  storeEmailTransaction,
} from '../../functions/src/repository.js';
import { notifyPendingCategory } from '../../functions/src/telegram.js';
import { automationEnabled, financeRuntimeConfig, initializeFinanceAdmin, requiredEnv } from './_runtime.mjs';

const PARSER_VERSION = 'vi-finance-v2';

export default async () => {
  if (!automationEnabled()) return Response.json({ disabled: true });
  initializeFinanceAdmin();
  const runtime = financeRuntimeConfig();
  const accessToken = await getAccessToken({
    clientId: requiredEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    refreshToken: requiredEnv('GMAIL_REFRESH_TOKEN'),
  });
  const maxMessages = Math.max(1, Math.min(100, Number(process.env.GMAIL_MAX_MESSAGES || 30)));
  const messageIds = await listGmailMessageIds(
    accessToken,
    process.env.GMAIL_QUERY || 'newer_than:2d',
    maxMessages,
  );
  let created = 0;

  for (const messageId of messageIds) {
    if (await hasProcessedEmail(runtime.uid, messageId)) continue;
    try {
      const message = await getGmailMessage(accessToken, messageId);
      const parsed = parseVietnameseFinanceEmail(message);
      if (!parsed) {
        await recordSkippedEmail(runtime.uid, messageId, 'parse_failed', { parserVersion: PARSER_VERSION });
        continue;
      }
      const account = await findTrackedAccount(runtime.uid, parsed.sourceAccountLast4);
      if (!account) {
        await recordSkippedEmail(runtime.uid, messageId, 'unmatched_or_disabled_account', {
          sourceAccountLast4: parsed.sourceAccountLast4 || null,
          parserVersion: PARSER_VERSION,
        });
        continue;
      }
      const result = await storeEmailTransaction({
        uid: runtime.uid,
        messageId,
        parsed,
        account,
        accountHmacSecret: requiredEnv('ACCOUNT_HMAC_SECRET'),
        parserVersion: PARSER_VERSION,
      });
      if (result.created) created += 1;
    } catch (error) {
      console.error('Failed to process Gmail message', { messageId, error });
    }
  }

  const pendingNotifications = await listUnnotifiedPendingTransactions(runtime.uid);
  for (const transaction of pendingNotifications) {
    try {
      const telegramMessageId = await notifyPendingCategory(
        runtime.botToken,
        runtime.chatId,
        runtime.uid,
        transaction,
      );
      if (telegramMessageId && transaction.id) {
        await markTelegramNotified(runtime.uid, transaction.id, telegramMessageId);
      }
    } catch (error) {
      console.error('Failed to deliver Telegram classification', { transactionId: transaction.id, error });
    }
  }

  console.log('Gmail sync completed', { scanned: messageIds.length, created });
  return Response.json({ scanned: messageIds.length, created });
};

export const config: Config = {
  schedule: '*/10 * * * *',
};
