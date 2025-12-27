import React from 'react';
import { X, Calendar, Mail, Crown, LogOut, User } from 'lucide-react';
import { signOut } from "firebase/auth";
import { auth } from '../../lib/firebase';

const UserProfileModal = ({ isOpen, onClose, user, isPremium, createdAt, expirationDate }) => {
    if (!isOpen) return null;

    const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
    const userInitial = userName.charAt(0).toUpperCase();
    const userEmail = user?.email || 'N/A';

    const formatDate = (date) => {
        if (!date) return 'N/A';
        if (date === 'lifetime') return 'Vĩnh viễn';
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const handleLogout = () => {
        signOut(auth);
        // Navigation will be handled by auth state listener in App.jsx
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col items-center border-b border-slate-100 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white text-gray-400 hover:text-gray-600 shadow-sm transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="relative mb-4">
                        <div className={`
                w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-blue-200 shadow-xl
                ${isPremium ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}
              `}>
                            {userInitial}
                        </div>
                        {isPremium && (
                            <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 p-2 rounded-full shadow-lg border-2 border-white transform rotate-12">
                                <Crown size={20} fill="currentColor" strokeWidth={2.5} />
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900">{userName}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                        {isPremium ? (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full border border-yellow-200 flex items-center gap-1">
                                <Crown size={12} fill="currentColor" /> PREMIUM
                            </span>
                        ) : (
                            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-300">
                                FREE TRIAL
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                                <Mail size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Email</p>
                                <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]" title={userEmail}>{userEmail}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                                <User size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Ngày kích hoạt</p>
                                <p className="text-sm font-semibold text-gray-800">{formatDate(createdAt)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">{isPremium ? 'Ngày hết hạn' : 'Ngày hết hạn (dùng thử)'}</p>
                                <p className={`text-sm font-bold ${isPremium ? 'text-yellow-600' : 'text-red-500'}`}>
                                    {formatDate(expirationDate)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full mt-2 bg-red-50 hover:bg-red-100 text-red-600 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors font-bold active:scale-[0.98]"
                    >
                        <LogOut size={20} /> Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
