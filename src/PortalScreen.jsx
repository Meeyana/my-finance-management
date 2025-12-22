// src/PortalScreen.jsx
import React from 'react';
import { Wallet, Activity, LogOut, ArrowRight } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function PortalScreen({ user }) {
  const navigate = useNavigate();
  const userName = user.isAnonymous ? 'Khách' : (user.displayName || user.email?.split('@')[0]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 1. Header (Chứa nút đăng xuất Desktop) */}
      <div className="p-6 md:p-10 pb-0">
        <div className="max-w-4xl mx-auto w-full flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Xin chào, {userName}</h1>
              <p className="text-gray-500 mt-2 text-lg">Hôm nay bạn muốn quản lý điều gì?</p>
            </div>
            
            {/* NÚT ĐĂNG XUẤT DESKTOP: Chỉ hiện khi màn hình > md (Tablet/Desktop) */}
            <button 
              onClick={() => signOut(auth)}
              className="hidden md:flex items-center gap-2 text-gray-400 hover:text-red-600 font-medium bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm transition-colors"
            >
              <LogOut size={18} /> Đăng xuất
            </button>
        </div>
      </div>

      {/* 2. Content */}
      <div className="flex-1 p-6 md:p-10 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD FINANCE */}
          <button 
            onClick={() => navigate('/finance')}
            className="group bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl hover:shadow-2xl hover:shadow-blue-200/50 transition-all text-left relative overflow-hidden h-72 md:h-80 flex flex-col justify-between active:scale-[0.98]"
          >
             <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
               <Wallet size={32} strokeWidth={1.5} />
             </div>
             <div className="relative z-10">
               <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Quản Lý Tài Chính</h2>
               <p className="text-gray-500 leading-relaxed">Theo dõi dòng tiền, kiểm soát ngân sách và báo cáo tài chính cá nhân.</p>
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <div className="absolute bottom-8 right-8 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">
                <ArrowRight size={24} />
             </div>
          </button>

          {/* CARD HABIT */}
          <button 
            onClick={() => navigate('/habits')}
            className="group bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl hover:shadow-2xl hover:shadow-orange-200/50 transition-all text-left relative overflow-hidden h-72 md:h-80 flex flex-col justify-between active:scale-[0.98]"
          >
             <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
               <Activity size={32} strokeWidth={1.5} />
             </div>
             <div className="relative z-10">
               <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">Habit Tracker</h2>
               <p className="text-gray-500 leading-relaxed">Xây dựng thói quen tích cực, theo dõi chuỗi (streak) và kỷ luật bản thân.</p>
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <div className="absolute bottom-8 right-8 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all">
                <ArrowRight size={24} />
             </div>
          </button>
        </div>
      </div>

      {/* 3. Footer Mobile (Nút đăng xuất Mobile) */}
      {/* Chỉ hiện khi màn hình < md (Mobile) */}
      <div className="md:hidden p-6 mt-auto border-t border-slate-100 bg-white">
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 text-red-500 hover:text-white hover:bg-red-500 px-6 py-3 rounded-xl font-bold transition-all bg-red-50 w-full justify-center"
        >
          <LogOut size={20} /> Đăng xuất
        </button>
      </div>
    </div>
  );
}