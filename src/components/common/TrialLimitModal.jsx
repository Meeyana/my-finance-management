// src/components/common/TrialLimitModal.jsx
import React from 'react';
import { Lock, Star, X, CheckCircle2, Crown } from 'lucide-react';

const TrialLimitModal = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop mờ */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header hình ảnh/màu sắc */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-center text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all"
          >
            <X size={18} />
          </button>
          
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-inner border border-white/30">
            <Lock size={32} className="text-white" />
          </div>
          <h3 className="text-xl font-bold">Giới hạn gói dùng thử</h3>
          <p className="text-indigo-100 text-xs mt-1 px-4">
            Bạn đã hết 7 ngày trải nghiệm miễn phí tính năng cao cấp.
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-600 text-sm">
              Hiện tại bạn đang ở chế độ <span className="font-bold text-gray-800">Chỉ Xem (Read-only)</span>. Dữ liệu cũ vẫn an toàn nhưng bạn không thể thêm hoặc sửa đổi.
            </p>
          </div>

          {/* Danh sách lợi ích */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              <span>Mở khóa thêm/sửa/xóa không giới hạn</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              <span>Đồng bộ dữ liệu đa thiết bị</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              <span>Biểu đồ báo cáo nâng cao</span>
            </div>
          </div>

          {/* Button Action */}
          <button 
            onClick={onUpgrade}
            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            <Crown size={18} className="text-yellow-400 group-hover:scale-110 transition-transform" />
            <span>Nâng cấp ngay (50k/tháng)</span>
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-3 mt-2 text-gray-400 text-xs font-bold hover:text-gray-600 transition-colors"
          >
            Để sau, tôi chỉ muốn xem lại dữ liệu
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialLimitModal;