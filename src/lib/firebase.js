import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc } from 'firebase/firestore';

// Centralized Firebase config and initialization
const firebaseConfig = {
  apiKey: 'AIzaSyAc3uMaQ-1oQJW-J2U6I4qqfpf-XUKgRp0',
  authDomain: 'quan-ly-chi-tieu-1ce0f.firebaseapp.com',
  projectId: 'quan-ly-chi-tieu-1ce0f',
  storageBucket: 'quan-ly-chi-tieu-1ce0f.firebasestorage.app',
  messagingSenderId: '31622801510',
  appId: '1:31622801510:web:2d6eeb5ab18f7e3a06a5a7',
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
