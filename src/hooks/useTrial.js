// src/hooks/useTrial.js
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore"; // No updateDoc needed
import { db } from '../lib/firebase';

const TRIAL_LIMIT_DAYS = 7;

export const useTrial = (user) => {
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [daysLeft, setDaysLeft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Anonymous / No User -> Allow
    if (!user || user.isAnonymous) {
      setIsReadOnly(false);
      setDaysLeft(null);
      setLoading(false);
      return;
    }

    // 2. Authenticated User Check
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let isPremiumActive = false;

        // A. LIFETIME CHECK
        // Check both boolean true and string "true" (common manual entry mistake)
        if (data.isUnlimited === true || data.isUnlimited === "true") {
          isPremiumActive = true;
          console.log("User has Unlimited Access (Lifetime)");
        }

        // B. EXPIRATION DATE CHECK
        // 'isPremium' is now treated as a Timestamp (if it exists)
        if (!isPremiumActive && data.isPremium && data.isPremium.toDate) {
          const expireDate = data.isPremium.toDate();
          const now = new Date();
          if (now < expireDate) {
            isPremiumActive = true;
          }
        }

        if (isPremiumActive) {
          // User is Valid Premium
          setIsReadOnly(false);
          setDaysLeft(null);
        } else {
          // Fallback to TRIAL Logic
          const startDate = data.createdAt?.toDate() || new Date();
          const now = new Date();
          const diffTime = now - startDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const remaining = TRIAL_LIMIT_DAYS - diffDays;

          setDaysLeft(remaining > 0 ? remaining : 0);
          setIsReadOnly(remaining <= 0); // Lock if trial over
        }
      }
      setLoading(false);
    }, (err) => setLoading(false));

    return () => unsub();
  }, [user]);

  return { isReadOnly, daysLeft, loading };
};