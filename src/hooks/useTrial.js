// src/hooks/useTrial.js
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../lib/firebase';

const TRIAL_LIMIT_DAYS = 7;

export const useTrial = (user) => {
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [daysLeft, setDaysLeft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Nếu không có user hoặc ĐANG LÀ ẨN DANH (PUBLIC)
    // -> Luôn cho phép sửa (isReadOnly = false)
    if (!user || user.isAnonymous) {
      setIsReadOnly(false);
      setDaysLeft(null); // Không hiện đếm ngược
      setLoading(false);
      return;
    }

    // 2. Nếu là User thật -> Check Firestore
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isPremium) {
          setIsReadOnly(false);
          setDaysLeft(null);
        } else {
          // Tính toán ngày còn lại
          const startDate = data.createdAt?.toDate() || new Date();
          const now = new Date();
          const diffTime = now - startDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const remaining = TRIAL_LIMIT_DAYS - diffDays;
          
          setDaysLeft(remaining > 0 ? remaining : 0);
          setIsReadOnly(remaining <= 0); // Hết hạn thì khóa
        }
      }
      setLoading(false);
    }, (err) => setLoading(false));

    return () => unsub();
  }, [user]);

  return { isReadOnly, daysLeft, loading };
};