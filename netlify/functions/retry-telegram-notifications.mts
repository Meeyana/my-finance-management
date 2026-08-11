import type { Config } from '@netlify/functions';
import {
  listUnnotifiedPendingTransactions,
  markTelegramNotified,
} from '../../functions/src/repository.js';
import { notifyPendingCategory } from '../../functions/src/telegram.js';
import { automationEnabled, financeRuntimeConfig, initializeFinanceAdmin } from './_runtime.mjs';

export default async () => {
  if (!automationEnabled()) return Response.json({ disabled: true });
  initializeFinanceAdmin();
  const runtime = financeRuntimeConfig();
  const pending = await listUnnotifiedPendingTransactions(runtime.uid);
  let notified = 0;

  for (const transaction of pending) {
    if (!transaction.id) continue;
    try {
      const telegramMessageId = await notifyPendingCategory(
        runtime.botToken,
        runtime.chatId,
        runtime.uid,
        transaction,
      );
      if (telegramMessageId) {
        await markTelegramNotified(runtime.uid, transaction.id, telegramMessageId);
        notified += 1;
      }
    } catch (error) {
      console.error('Telegram notification retry failed', { transactionId: transaction.id, error });
    }
  }

  return Response.json({ pending: pending.length, notified });
};

export const config: Config = {
  schedule: '*/10 * * * *',
};
