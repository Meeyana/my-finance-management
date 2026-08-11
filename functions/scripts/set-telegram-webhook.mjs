const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !webhookUrl || !secretToken) {
  throw new Error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_URL and TELEGRAM_WEBHOOK_SECRET.');
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: webhookUrl, secret_token: secretToken, allowed_updates: ['callback_query'] }),
});
const result = await response.json();
if (!response.ok || !result.ok) throw new Error(JSON.stringify(result));
console.log('Telegram webhook configured successfully.');
