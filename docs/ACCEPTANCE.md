# Finance upgrade acceptance checklist

## Phase 0 - legacy stabilization

- [x] Browser-side recurring executor removed.
- [x] Recurring menu hidden behind a disabled feature flag.
- [x] Existing recurring Firestore documents preserved.
- [x] Duplicate finance listeners removed; loans and accounts listeners clean up.
- [x] Finance production build passes.

## Phase 1 - finance domain and tracked accounts

- [x] Legacy transactions still count as expenses.
- [x] Income, transfer, credit payment, refund and fee have separate semantics.
- [x] Credit payments and internal transfers do not count as a second expense.
- [x] Account list supports bank, credit card and cash.
- [x] `ingestEnabled` and `includeInReports` are independent controls.
- [x] Manual transactions can select type and source account.

## Phase 2 - n8n ingestion

- [x] n8n owns Gmail OAuth and email triggering.
- [x] Netlify exposes a secret-authenticated ingestion endpoint.
- [x] Gmail/Google credentials are not required by Netlify.
- [x] Only tracked account/card last-four matches are ingested.
- [x] Deterministic source IDs and Firestore transactions prevent duplicates.
- [x] Credit payment, refund and fee event types are represented.
- [x] Debit transfer and VIB credit-card parser fixtures pass.
- [x] Local n8n export is ignored by Git and no longer writes directly to Firebase.
- [ ] Production VIB execution returns 201, then 200 on retry.
- [ ] Debit-bank Gmail Trigger sender/search filter is supplied and tested.

## Phase 3 - Telegram and learned account rules

- [x] Unknown outgoing transfers become `pending_category` and do not affect totals yet.
- [x] Telegram button or text reply can choose a category, internal transfer, or ignore.
- [x] Destination account is HMACed before persistence.
- [x] Category choice creates an account/merchant category rule.
- [x] A repeated account/merchant applies the rule without another prompt.
- [x] Failed immediate Telegram notifications are retried every 10 minutes.
- [x] Daily 21:00 and Sunday 20:30 reports are idempotent.
- [ ] Bot webhook and reply flow pass a production smoke test.

## Phase 4 - release gate

- [x] Frontend finance lint passes.
- [x] Frontend production build passes.
- [x] Domain and parser automated tests pass.
- [x] Full-repository lint is clean, including repaired Habit/Trial legacy findings.
- [x] Local login screen smoke test passes without browser console errors.
- [x] Tailwind is bundled locally instead of loaded from the production CDN.
- [x] Netlify Functions and UTC schedules are included in Git deployments.
- [ ] Firebase rules tested against the target project/emulator before deployment.

## Known release note

The legacy repository already tracks `node_modules`. Existing unrelated dependency
changes must remain outside finance commits and should be removed from Git in a
separate cleanup.
