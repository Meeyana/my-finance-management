export const FINANCE_FEATURES = Object.freeze({
  // Legacy recurring schedules stay in Firestore, but browser-side execution
  // remains disabled until a server-side idempotent scheduler replaces it.
  recurringExpenses: false,
});
