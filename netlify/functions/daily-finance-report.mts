import type { Config } from '@netlify/functions';
import { dateKeyInTimeZone } from '../../functions/src/domain.js';
import { buildFinanceReport, sendReportOnce } from '../../functions/src/reports.js';
import { automationEnabled, financeRuntimeConfig, initializeFinanceAdmin } from './_runtime.mjs';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export default async () => {
  if (!automationEnabled()) return Response.json({ disabled: true });
  initializeFinanceAdmin();
  const runtime = financeRuntimeConfig();
  const date = dateKeyInTimeZone(new Date(), TIME_ZONE);
  const report = await buildFinanceReport(runtime.uid, date, date, 'Báo cáo tài chính hôm nay');
  const sent = await sendReportOnce(runtime.uid, `daily_${date}`, runtime.botToken, runtime.chatId, report);
  return Response.json({ sent, date });
};

export const config: Config = {
  schedule: '0 14 * * *',
};
