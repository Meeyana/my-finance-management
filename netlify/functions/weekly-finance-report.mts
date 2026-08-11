import type { Config } from '@netlify/functions';
import { dateKeyInTimeZone } from '../../functions/src/domain.js';
import { buildFinanceReport, sendReportOnce } from '../../functions/src/reports.js';
import { automationEnabled, financeRuntimeConfig, initializeFinanceAdmin } from './_runtime.mjs';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export default async () => {
  if (!automationEnabled()) return Response.json({ disabled: true });
  initializeFinanceAdmin();
  const runtime = financeRuntimeConfig();
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const startDate = dateKeyInTimeZone(start, TIME_ZONE);
  const endDate = dateKeyInTimeZone(end, TIME_ZONE);
  const report = await buildFinanceReport(runtime.uid, startDate, endDate, 'Tổng kết tài chính 7 ngày');
  const sent = await sendReportOnce(runtime.uid, `weekly_${endDate}`, runtime.botToken, runtime.chatId, report);
  return Response.json({ sent, startDate, endDate });
};

export const config: Config = {
  schedule: '30 13 * * 0',
};
