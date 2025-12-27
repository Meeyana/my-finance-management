// src/App.jsx
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginScreen from './features/auth/LoginScreen';
import PortalScreen from './PortalScreen';
import FinanceApp from './features/finance/FinanceApp';
import HabitApp from './features/habits/HabitApp';
import PricingPage from './pages/PricingPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // --- LOGIC MỚI Ở ĐÂY ---
  // Chúng ta KHÔNG return <LoginScreen /> sớm ở đây nữa.
  // Hãy để Router quyết định việc chuyển trang.

  return (
    <Routes>
      {/* TRANG CHỦ (/):
        - Nếu chưa đăng nhập (!user) -> Hiện LoginScreen
        - Nếu đã đăng nhập (user) -> Hiện PortalScreen
      */}
      <Route
        path="/"
        element={!user ? <LoginScreen /> : <PortalScreen user={user} />}
      />

      {/* TRANG FINANCE (/finance):
        - Nếu chưa đăng nhập -> Dùng <Navigate> để đá về trang chủ '/' (URL sẽ đổi theo)
        - Nếu đã đăng nhập -> Hiện FinanceApp
      */}
      <Route
        path="/finance"
        element={!user ? <Navigate to="/" replace /> : <FinanceApp user={user} />}
      />

      {/* TRANG HABITS (/habits):
        - Tương tự như Finance
      */}
      <Route
        path="/habits"
        element={!user ? <Navigate to="/" replace /> : <HabitApp user={user} />}
      />

      <Route
        path="/pricing"
        element={<PricingPage user={user} />}
      />

      {/* CATCH ALL (*):
        - Gõ linh tinh cũng về trang chủ
      */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}