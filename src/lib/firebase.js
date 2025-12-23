import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc } from 'firebase/firestore';

// Centralized Firebase config and initialization
const firebaseConfig = {
  // Cách viết cho Vite (phổ biến nhất hiện nay)
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'quan-ly-chi-tieu-personal';

// Paths helper used across features
const getFirestorePaths = (user) => {
  if (!user) return null;

  const basePath = ['artifacts', appId];
  const userPath = user.isAnonymous
    ? [...basePath, 'public', 'data']
    : [...basePath, 'users', user.uid];

  return {
    transactions: collection(db, ...userPath, 'transactions'),
    budgetConfig: doc(db, ...userPath, 'budgets', 'config'),
    categories: doc(db, ...userPath, 'settings', 'categories'),
    visibility: doc(db, ...userPath, 'settings', 'visibility'),
    alerts: doc(db, ...userPath, 'settings', 'alerts'),
    notes: doc(db, ...userPath, 'stats', 'notes'),
    recurring: collection(db, ...userPath, 'recurring'),
    monthlyStats: (year, month) => doc(db, ...userPath, 'monthly_stats', `${year}-${month}`),
    allMonthlyStats: collection(db, ...userPath, 'monthly_stats'),
    isPublic: user.isAnonymous,
  };
};

export { app, auth, db, appId, getFirestorePaths };
