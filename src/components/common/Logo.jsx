import React from 'react';
import { Wallet, Crown } from 'lucide-react';

const Logo = ({ size = 32, showText = true, isPremium = false, className = '' }) => {
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className="relative">
                <div className={`
                ${size === 32 ? 'w-16 h-16' : `w-${size / 4} h-${size / 4}`} 
                bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200
                ${isPremium ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
            `}
                    style={{ width: size * 2, height: size * 2 }}
                >
                    <Wallet size={size} />
                </div>
                {isPremium && (
                    <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 p-1.5 rounded-full shadow-md border-2 border-white transform rotate-12">
                        <Crown size={size * 0.5} fill="currentColor" strokeWidth={2.5} />
                    </div>
                )}
            </div>

            {showText && (
                <>
                    <h1 className="text-2xl font-bold text-gray-900 mt-4 flex items-center gap-2">
                        Quản Lý Chi Tiêu
                        {isPremium && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 uppercase tracking-wider font-extrabold">Premium</span>}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Đăng nhập để truy cập dữ liệu cá nhân</p>
                </>
            )}
        </div>
    );
};

export default Logo;
