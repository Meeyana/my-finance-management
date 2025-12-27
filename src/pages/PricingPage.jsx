import React from 'react';
import { Check, Star, Zap, Shield, Crown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PricingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* HEADER */}
            <header className="bg-slate-900 text-white py-12 pb-24 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] rounded-full bg-indigo-500 blur-[120px]"></div>
                    <div className="absolute bottom-[-50%] right-[-20%] w-[800px] h-[800px] rounded-full bg-pink-500 blur-[120px]"></div>
                </div>

                <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute left-6 top-0 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
                        <Crown size={14} /> Premium Upgrade
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                        Mở khóa toàn bộ sức mạnh <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Quản Lý Bản Thân</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Không giới hạn thói quen, mục tiêu và phân tích tài chính chuyên sâu.
                        Đầu tư cho bản thân ngay hôm nay.
                    </p>
                </div>
            </header>

            {/* PRICING CARDS */}
            <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-20 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* GOI 1: MONTHLY */}
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col hover:-translate-y-2 transition-transform duration-300">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-500">Gói Tháng</h3>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-4xl font-extrabold text-slate-800">29.000đ</span>
                                <span className="text-slate-400">/tháng</span>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">Thích hợp để trải nghiệm đầy đủ tính năng trong ngắn hạn.</p>
                        <button className="w-full py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold transition-colors mb-8">
                            Chọn Gói Tháng
                        </button>
                        <div className="space-y-3 flex-1">
                            <FeatureItem text="Tất cả tính năng Premium" />
                            <FeatureItem text="Không giới hạn Thói quen" />
                            <FeatureItem text="Không giới hạn Mục tiêu" />
                            <FeatureItem text="Hỗ trợ cơ bản" />
                        </div>
                    </div>

                    {/* GOI 2: YEARLY (POPULAR) */}
                    <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-800 flex flex-col scale-105 relative ring-4 ring-indigo-500/20">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                            PHỔ BIẾN NHẤT
                        </div>
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-indigo-400">Gói Năm</h3>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-5xl font-extrabold text-white">299.000đ</span>
                                <span className="text-slate-400">/năm</span>
                            </div>
                            <p className="text-xs text-green-400 mt-2 font-bold">Tiết kiệm 15% so với tháng</p>
                        </div>
                        <p className="text-slate-400 text-sm mb-6">Cam kết dài hạn cho sự phát triển của bản thân.</p>
                        <button className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-bold shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/80 transition-all mb-8 active:scale-[0.98]">
                            Đăng Ký Ngay
                        </button>
                        <div className="space-y-4 flex-1">
                            <FeatureItem text="Tất cả tính năng Premium" dark />
                            <FeatureItem text="Phân tích dữ liệu nâng cao" dark />
                            <FeatureItem text="Xuất báo cáo PDF (Coming soon)" dark />
                            <FeatureItem text="Hỗ trợ ưu tiên 24/7" dark />
                            <FeatureItem text="Huy hiệu thành viên VIP" dark />
                        </div>
                    </div>

                    {/* GOI 3: LIFETIME */}
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col hover:-translate-y-2 transition-transform duration-300">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-500">Trọn Đời</h3>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-4xl font-extrabold text-slate-800">499.000đ</span>
                                <span className="text-slate-400">/1 lần</span>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">Thanh toán một lần, sở hữu mãi mãi. Không gia hạn.</p>
                        <button className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors mb-8">
                            Mua Trọn Đời
                        </button>
                        <div className="space-y-3 flex-1">
                            <FeatureItem text="Sở hữu vĩnh viễn" />
                            <FeatureItem text="Tất cả update trong tương lai" />
                            <FeatureItem text="Không lo phí duy trì" />
                            <FeatureItem text="Hỗ trợ VIP trọn đời" />
                        </div>
                    </div>
                </div>

                {/* COMPARISON TABLE */}
                <div className="mt-20 max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-center text-slate-800 mb-10">So sánh quyền lợi</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 py-6 font-bold text-slate-600 w-1/2">Tính năng</th>
                                    <th className="p-4 py-6 font-bold text-slate-600 text-center">Miễn phí</th>
                                    <th className="p-4 py-6 font-bold text-indigo-600 text-center bg-indigo-50/50">Premium</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <TableRow feature="Thời gian trải nghiệm" free="7 ngày" premium="Vĩnh viễn" />
                                <TableRow feature="Số lượng Thói quen" free="Giới hạn" premium="Không giới hạn" />
                                <TableRow feature="Số lượng Mục tiêu" free="Giới hạn" premium="Không giới hạn" />
                                <TableRow feature="Nhập/Sửa dữ liệu cũ" free={<Check size={18} className="text-slate-300 mx-auto" />} premium={<Check size={18} className="text-green-500 mx-auto" />} />
                                <TableRow feature="Báo cáo nâng cao" free={<Check size={18} className="text-slate-300 mx-auto" />} premium={<Check size={18} className="text-green-500 mx-auto" />} />
                                <TableRow feature="Không quảng cáo" free={<Check size={18} className="text-slate-300 mx-auto" />} premium={<Check size={18} className="text-green-500 mx-auto" />} />
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-20 text-center text-slate-400 text-sm">
                    <p>Thanh toán an toàn & bảo mật. Hoàn tiền trong 30 ngày nếu không hài lòng.</p>
                    <p className="mt-2">© 2025 My Finance Management</p>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ text, dark = false }) {
    return (
        <div className={`flex items-center gap-3 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${dark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-green-100 text-green-600'}`}>
                <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-sm font-medium">{text}</span>
        </div>
    )
}

function TableRow({ feature, free, premium }) {
    return (
        <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="p-4 font-medium text-slate-700">{feature}</td>
            <td className="p-4 text-center text-slate-500">{free}</td>
            <td className="p-4 text-center font-bold text-indigo-900 bg-indigo-50/30">{premium}</td>
        </tr>
    )
}
