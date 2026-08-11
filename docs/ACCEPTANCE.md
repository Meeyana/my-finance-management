# Finance upgrade acceptance checklist

## Phase 0 — legacy stabilization

- [x] Browser-side recurring executor removed.
- [x] Recurring menu hidden behind a disabled feature flag.
- [x] Existing recurring Firestore documents preserved.
- [x] Duplicate finance listeners removed; loans and accounts listeners clean up.
- [x] Finance production build passes.

## Phase 1 — finance domain and tracked accounts

- [x] Legacy transactions still count as expenses.
- [x] Income, transfer, credit payment, refund and fee have separate semantics.
- [x] Credit payments and internal transfers do not count as a second expense.
- [x] Account list supports bank, credit card and cash.
- [x] `ingestEnabled` and `includeInReports` are independent controls.
- [x] Manual transactions can select type and source account.

## Phase 2 — Gmail ingestion

- [x] Gmail access runs in Firebase Functions, not the browser.
- [x] OAuth refresh token is read only from Secret Manager.
- [x] Only tracked account/card last-four matches are ingested.
- [x] Deterministic Gmail transaction IDs and Firestore transactions prevent duplicates.
- [x] Credit payment, refund and fee event types are represented.
- [x] Generic parser fixtures pass.
- [ ] Real bank/card fixtures supplied and accepted.
- [ ] Deployed Gmail end-to-end smoke test passes with production credentials.

## Phase 3 — Telegram and learned account rules

- [x] Unknown outgoing transfers become `pending_category` and do not affect totals yet.
- [x] Telegram callback can choose a category, internal transfer, or ignore.
- [x] Destination account is HMACed before persistence.
- [x] Category choice creates `counterpartyAccountKey → category/kind` rule.
- [x] A repeated transfer to the same account applies the rule without another prompt.
- [x] Daily 21:00 and Sunday 20:30 reports are idempotent.
- [ ] Bot webhook deployed and smoke-tested with the owner's private chat.

## Phase 4 — release gate

- [x] Frontend finance lint passes.
- [x] Frontend production build passes.
- [x] Domain and parser automated tests pass.
- [x] Full-repository lint is clean, including repaired Habit/Trial legacy findings.
- [x] Local login screen smoke test passes without browser console errors.
- [x] Tailwind is bundled locally instead of loaded from the production CDN.
- [ ] Firebase rules tested against the target project/emulator before deployment.

## Known release notes

- The legacy repository already tracks `node_modules`. New installs are ignored,
  but the tracked dependency tree should be removed from Git in a dedicated
  cleanup commit before merging this upgrade.
- The current Firebase Functions dependency tree reports moderate transitive
  `uuid` audit findings. npm offers only a breaking Firebase Admin downgrade, so
  no forced downgrade was applied.
