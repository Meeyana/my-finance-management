# My Finance Management

Personal finance and habit tracking application built with React, Vite, Firebase
Auth/Firestore, and Netlify Functions.

## Finance capabilities

- Manual income and expense ledger with budgets and reports.
- Bank account and credit-card tracking controls.
- Gmail ingestion through n8n with deterministic backend deduplication.
- Credit purchases, repayments, refunds, transfers, and fees have separate semantics.
- Telegram classification for unknown destination accounts.
- Learned HMAC account rules automatically categorize repeated transfers.
- Daily and weekly Telegram reports.
- Legacy browser-side recurring expenses are disabled to prevent duplicates.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

Quality gates:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd --prefix functions install
npm.cmd --prefix functions test
```

Production n8n, Telegram, Firebase Admin, and Netlify configuration is documented in
[`docs/NETLIFY_PRODUCTION.md`](docs/NETLIFY_PRODUCTION.md). Acceptance status is in
[`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md).

Secrets must be stored in Netlify/n8n secret configuration. Never expose Telegram,
ingestion, or Firebase Admin credentials through `VITE_*` variables.
