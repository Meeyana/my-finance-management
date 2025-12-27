// src/hooks/useTrial.js
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../lib/firebase';

const TRIAL_LIMIT_DAYS = 7;

export const useTrial = (user) => {
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [daysLeft, setDaysLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [activationDate, setActivationDate] = useState(null);
  const [expirationDate, setExpirationDate] = useState(null);

  useEffect(() => {
    if (user?.metadata?.creationTime) {
      setActivationDate(new Date(user.metadata.creationTime));
    } else {
      setActivationDate(new Date());
    }
  }, [user]);

  /* New State */
  const [createdDate, setCreatedDate] = useState(null);

  useEffect(() => {
    // 1. Anonymous / No User -> Allow
    if (!user || user.isAnonymous) {
      setIsReadOnly(false);
      setDaysLeft(null);
      setIsPremium(false);
      setLoading(false);
      setCreatedDate(new Date()); /* Default for anon */
      return;
    }

    // 2. Authenticated User Check
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Capture createdAt
        setCreatedDate(data.createdAt?.toDate ? data.createdAt.toDate() : new Date());

        let isPremiumActive = false;
        let expDate = null; // Local calc

        // A. LIFETIME CHECK
        if (data.isUnlimited === true || data.isUnlimited === "true") {
          isPremiumActive = true;
          expDate = 'lifetime';
        }

        // B. EXPIRATION DATE CHECK
        if (!isPremiumActive && data.isPremium && data.isPremium.toDate) {
          const expireDate = data.isPremium.toDate();
          const now = new Date();
          if (now < expireDate) {
            isPremiumActive = true;
            expDate = expireDate;
          }
        }

        if (isPremiumActive) {
          // User is Valid Premium
          setIsReadOnly(false);
          setDaysLeft(null);
          setIsPremium(true);
          setExpirationDate(expDate);
        } else {
          // Fallback to TRIAL Logic
          setIsPremium(false);
          const startDate = data.createdAt?.toDate() || new Date();
          const now = new Date();
          const diffTime = now - startDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const remaining = TRIAL_LIMIT_DAYS - diffDays;

          setDaysLeft(remaining > 0 ? remaining : 0);
          setIsReadOnly(remaining <= 0); // Lock if trial over

          // Calculate trial expiration date
          const trialExp = new Date(startDate);
          trialExp.setDate(trialExp.getDate() + TRIAL_LIMIT_DAYS);
          setExpirationDate(trialExp);
        }
      }
      setLoading(false);
    }, (err) => setLoading(false));

    return () => unsub();
  }, [user]);

  return { isReadOnly, daysLeft, loading, isPremium, activationDate, expirationDate, createdAt: createdDate };
};