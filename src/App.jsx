import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import { 
  LayoutDashboard, Wallet, Receipt, PlusCircle, Settings, 
  TrendingUp, TrendingDown, Search, Trash2, Save,
  Menu, X, Database, Calendar, AlertCircle, BarChart2, ArrowUpRight, ArrowDownRight,
  List, AlertTriangle, Repeat, CalendarClock, CheckCircle2, Edit,
  Coffee, ShoppingBag, BookOpen, Home, Fuel, Film, MoreHorizontal, ChevronDown,
  Heart, Star, Gift, Music, Briefcase, Plane, Gamepad2, GraduationCap,
  Baby, Dog, Car, Zap, Wifi, Phone, Dumbbell,
  Eye, EyeOff, Bell, BellOff, LogOut, Lock, User, Globe, Plus, DollarSign, Calculator,
  ClipboardList
} from 'lucide-react';

// FIREBASE IMPORTS
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut,                   
  onAuthStateChanged,
  signInWithCustomToken
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, onSnapshot, query, 
  deleteDoc, doc, setDoc, updateDoc, deleteField, serverTimestamp, increment 
} from "firebase/firestore";

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyAc3uMaQ-1oQJW-J2U6I4qqfpf-XUKgRp0",
  authDomain: "quan-ly-chi-tieu-1ce0f.firebaseapp.com",
  projectId: "quan-ly-chi-tieu-1ce0f",
  storageBucket: "quan-ly-chi-tieu-1ce0f.firebasestorage.app",
  messagingSenderId: "31622801510",
  appId: "1:31622801510:web:2d6eeb5ab18f7e3a06a5a7"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'quan-ly-chi-tieu-personal';

// --- ICON LIBRARY ---
const ICON_LIBRARY = {
  Coffee, ShoppingBag, BookOpen, Home, Fuel, Film, MoreHorizontal, TrendingUp,
  Heart, Star, Gift, Music, Briefcase, Plane, Gamepad2, GraduationCap,
  Baby, Dog, Car, Zap, Wifi, Phone, Dumbbell
};

// --- DEFAULT CONFIG ---
const DEFAULT_CATEGORY_CONFIG = {
  eating: { icon: 'Coffee', label: 'Ăn uống', color: '#EF4444' },
  investment: { icon: 'TrendingUp', label: 'Đầu tư', color: '#10B981' },
  entertainment: { icon: 'Film', label: 'Giải trí', color: '#8B5CF6' },
  learning: { icon: 'BookOpen', label: 'Học tập', color: '#3B82F6' },
  living: { icon: 'Home', label: 'Nhà cửa', color: '#F59E0B' },
  fuel: { icon: 'Fuel', label: 'Đi lại', color: '#6366F1' },
  shopping: { icon: 'ShoppingBag', label: 'Mua sắm', color: '#EC4899' },
  other: { icon: 'MoreHorizontal', label: 'Khác', color: '#6B7280' },
};

const INITIAL_BUDGETS = {
  eating: 0, investment: 0, entertainment: 0, learning: 0, 
  living: 0, fuel: 0, shopping: 0, other: 0
};

// --- UTILS ---
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

const formatShortCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '0';
  if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + ' tỷ';
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'tr';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
  return amount;
};

const getRandomColor = () => {
  const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', 
    '#8B5CF6', '#EC4899', '#F43F5E', '#84CC16', '#06B6D4',
    '#0EA5E9', '#64748B', '#A855F7', '#D946EF'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 ${className}`} {...props}>
    {children}
  </div>
);

const Badge = ({ color, children }) => (
  <span className="px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold text-white shadow-sm whitespace-nowrap inline-block" style={{ backgroundColor: color }}>
    {children}
  </span>
);

// --- PATH HELPER FUNCTION ---
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
    isPublic: user.isAnonymous
  };
};

// --- LOGIN COMPONENT ---
const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 1. THÊM STATE ĐỂ QUẢN LÝ ẨN/HIỆN
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setError('Đăng nhập thất bại. Vui lòng kiểm tra email hoặc mật khẩu.');
      setLoading(false);
    }
  };

  // ... (giữ nguyên hàm handleDemoLogin) ...
  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (err) {
      console.error("Lỗi đăng nhập demo:", err);
      let msg = 'Không thể truy cập demo. Vui lòng thử lại.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Lỗi: Bạn chưa bật "Anonymous Sign-in" trong Firebase Console.';
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Chi Tiêu</h1>
          <p className="text-gray-500 text-sm mt-1">Đăng nhập để truy cập dữ liệu cá nhân</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input 
                type="email" 
                required 
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          {/* --- PHẦN INPUT MẬT KHẨU ĐÃ CHỈNH SỬA --- */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input 
                // Thay đổi type dựa trên state showPassword
                type={showPassword ? "text" : "password"} 
                required 
                // Thêm padding-right (pr-12) để chữ không đè lên icon con mắt
                className="w-full pl-12 pr-12 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {/* Nút con mắt */}
              <button
                type="button" // Quan trọng: type="button" để không submit form
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {/* ----------------------------------------- */}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span> : 'Đăng Nhập'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={handleDemoLogin}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors inline-flex items-center gap-1 group"
          >
            Xem demo (Public Data) <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/>
          </button>
        </div>

      </div>
    </div>
  );
};

// --- DASHBOARD CONTENT ---
const DashboardContent = React.memo(({ 
  totalSpent, monthlyIncome, updateMonthlyIncome, spendingDiff, totalIncurred, alerts, 
  spendingByCategory, currentChartData, chartMode, setChartMode, 
  chartCategoryFilter, setChartCategoryFilter, allCategories, categoryVisibility,
  userName, isPublic
}) => {
  const [showCharts, setShowCharts] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false); 
  const [tempIncome, setTempIncome] = useState(monthlyIncome);

  useEffect(() => {
    const timer = setTimeout(() => setShowCharts(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setTempIncome(monthlyIncome);
  }, [monthlyIncome]);

  const handleSaveIncome = (e) => {
    e.preventDefault();
    updateMonthlyIncome(Number(tempIncome));
    setShowIncomeModal(false);
  };

  const remaining = monthlyIncome - totalSpent;
  const chartColor = chartMode === 'daily' ? '#3B82F6' : '#8B5CF6';

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1; 
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent === 0) return null;
    return <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="bold">{`${(percent * 100).toFixed(0)}%`}</text>;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              Xin chào, {userName}
              {isPublic && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">Public Mode</span>}
            </h2>
            <p className="text-gray-500">Đây là tình hình tài chính tháng này của bạn.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200 shadow-lg border-none relative overflow-hidden">
          <div className="relative z-10">
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Đã chi tiêu</p>
              <h3 className="text-3xl font-bold mt-2 tracking-tight">{formatCurrency(totalSpent)}</h3>
              <div className="mt-3 inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                {spendingDiff > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                {spendingDiff > 0 ? '+' : ''}{formatShortCurrency(spendingDiff)} so với tháng trước
              </div>
          </div>
          <TrendingDown className="absolute right-[-10px] bottom-[-10px] text-white opacity-20" size={100} />
        </Card>
        
        {/* SCORECARD THU NHẬP (CÓ POPUP) */}
        <Card className="cursor-pointer hover:shadow-md transition-all relative group" onClick={() => setShowIncomeModal(true)}>
           <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-1">Thu nhập tháng</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
                {formatCurrency(monthlyIncome)}
                <Edit size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
              </h3>
            </div>
            <div className="p-2.5 bg-green-50 rounded-xl text-green-600"><DollarSign size={24} /></div>
          </div>
        </Card>
        
        {/* SCORECARD CÒN LẠI (STYLE GỐC) */}
        <Card>
           <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Còn lại</p>
              <h3 className={`text-2xl font-bold mt-1 ${remaining < 0 ? 'text-red-600' : 'text-indigo-600'}`}>
                {formatCurrency(remaining)}
              </h3>
            </div>
             <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><TrendingUp size={24} /></div>
          </div>
        </Card>

        <Card>
           <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Phát sinh</p>
              <h3 className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalIncurred)}</h3>
            </div>
             <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600"><AlertCircle size={24} /></div>
          </div>
        </Card>
      </div>

      {/* POPUP NHẬP THU NHẬP */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Cập nhật thu nhập</h3>
              <button onClick={(e) => { e.stopPropagation(); setShowIncomeModal(false); }} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveIncome}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tổng thu nhập tháng này</label>
                <input 
                  type="number" 
                  autoFocus
                  className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xl font-bold text-gray-800" 
                  placeholder="0"
                  value={tempIncome === 0 ? '' : tempIncome}
                  onChange={(e) => setTempIncome(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">Lưu thay đổi</button>
            </form>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`p-4 rounded-xl border-l-4 shadow-sm flex items-center gap-3 ${alert.type === 'danger' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-yellow-50 border-yellow-500 text-yellow-800'}`}>
              {alert.type === 'danger' ? <AlertCircle size={20} /> : <AlertTriangle size={20} />}
              <div className="flex-1">
                <p className="font-bold text-sm">{alert.message}</p>
                <p className="text-xs opacity-80">Đã dùng {(alert.ratio * 100).toFixed(0)}% ngân sách danh mục.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[420px]">
          <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <PieChart size={20} className="text-gray-400" /> Phân bổ chi tiêu
          </h4>
          <div className="h-80 w-full">
             {!showCharts ? (
                <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse"><p className="text-gray-400 text-sm">Đang tải biểu đồ...</p></div>
             ) : totalSpent > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingByCategory.filter(i => i.value > 0)}
                    cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value" label={renderCustomizedLabel}
                    activeShape={null} 
                  >
                    {spendingByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />)}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-gray-400"><Database size={48} className="mb-2 opacity-10" /><p className="text-sm">Chưa có dữ liệu</p></div>
             )}
          </div>
        </Card>

        <Card className="min-h-[420px]">
          <div className="flex flex-col gap-3 mb-4">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h4 className="font-bold text-gray-800 flex items-center gap-2"><BarChart2 size={20} className="text-gray-400" /> Xu hướng chi tiêu</h4>
              <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-bold w-full sm:w-auto">
                <button 
                  onClick={() => setChartMode('daily')} 
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md transition-all active:scale-95 ${chartMode === 'daily' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 sm:hover:text-gray-700 active:bg-gray-200'}`}
                >
                  Ngày
                </button>
                <button 
                  onClick={() => setChartMode('monthly')} 
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md transition-all active:scale-95 ${chartMode === 'monthly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 sm:hover:text-gray-700 active:bg-gray-200'}`}
                >
                  Tháng
                </button>
              </div>
            </div>
            <div className="self-end w-full sm:w-auto">
               <select 
                 className="custom-select w-full sm:w-auto pl-3 py-2 pr-10 text-base sm:text-xs border border-slate-200 rounded-lg bg-white outline-none text-gray-600 font-medium active:bg-gray-50" 
                 value={chartCategoryFilter} 
                 onChange={(e) => setChartCategoryFilter(e.target.value)}
               >
                 <option value="all">Tất cả mục</option>
                 {allCategories.filter(c => categoryVisibility[c.id] !== false).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>
          </div>
          <div className="h-80 w-full">
            {!showCharts ? (
               <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse"><p className="text-gray-400 text-sm">Đang tải biểu đồ...</p></div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94A3B8'}} axisLine={false} tickLine={false} interval={chartMode === 'daily' ? 2 : 0} />
                <YAxis hide />
                <RechartsTooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label, payload) => payload[0]?.payload.fullLabel || label} cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                <Bar dataKey="amount" fill={chartColor} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-6">
          <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Settings size={20} className="text-gray-400" /> Thực tế vs Hạn mức (Categories)
          </h4>
          <p className="text-sm text-gray-500 mb-2">So sánh chi tiêu thực tế với định mức bạn đặt cho từng danh mục.</p>
          <div className="flex flex-wrap gap-3 sm:gap-4 text-xs font-medium text-gray-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Trong hạn mức</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Sắp hết hạn mức</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Vượt quá hạn mức</span>
            </div>
          </div>
        </div>
        
        <div className="h-[500px] w-full">
          {!showCharts ? (
             <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse"><p className="text-gray-400 text-sm">Đang tải biểu đồ...</p></div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendingByCategory.filter(item => item.value > 0 || item.budget > 0)} layout="vertical" margin={{left: 40, right: 60}} barCategoryGap={24}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{fontSize: 12, fill: '#4B5563', fontWeight: 600}} width={80} axisLine={false} tickLine={false} />
              <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
              <Bar dataKey="value" name="Thực tế" barSize={20} radius={[0, 6, 6, 0]} isAnimationActive={false} activeBar={false}>
                 {spendingByCategory.map((entry, index) => {
                    let barColor = '#3B82F6';
                    if (entry.budget > 0) {
                      const ratio = entry.value / entry.budget;
                      if (ratio >= 1) barColor = '#EF4444';
                      else if (ratio >= 0.8) barColor = '#F59E0B';
                    }
                    return <Cell key={`cell-${index}`} fill={barColor} />;
                 })}
                 <LabelList dataKey="value" position="right" formatter={(val) => val > 0 ? formatShortCurrency(val) : ''} style={{fontSize: '11px', fontWeight: 'bold', fill: '#6B7280'}} />
              </Bar>
              <Bar dataKey="budget" name="Định mức" fill="#F3F4F6" barSize={20} radius={[0, 6, 6, 0]} isAnimationActive={false} activeBar={false}>
                 <LabelList dataKey="budget" position="right" formatter={(val) => val > 0 ? formatShortCurrency(val) : ''} style={{fontSize: '11px', fill: '#9CA3AF'}} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
});

// --- COMPONENT: TRANSACTION CONTENT ---
const TransactionContent = ({ 
  filtered, viewMonth, viewYear, search, setSearch, filterCategory, setFilterCategory, deleteTransaction, onEdit, allCategories
}) => {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Receipt size={20} /></div>
           <div><h3 className="font-bold text-gray-800">Sổ giao dịch</h3><p className="text-xs text-gray-500">Tháng {parseInt(viewMonth) + 1}/{viewYear}</p></div>
         </div>
         <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-bold text-gray-600 whitespace-nowrap">{filtered.length} giao dịch</span>
      </div>

      <Card className="p-0 overflow-hidden border-0 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="text" placeholder="Tìm kiếm..." className="w-full pl-10 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select 
            className="custom-select p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-full md:min-w-[180px] text-base sm:text-sm font-medium text-gray-600" 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-white border-b border-gray-100">
              <tr>
                <th className="px-2 py-3 sm:px-6 sm:py-4 font-semibold whitespace-nowrap">Thời gian</th>
                <th className="px-2 py-3 sm:px-6 sm:py-4 font-semibold whitespace-nowrap">Danh mục</th>
                <th className="px-2 py-3 sm:px-6 sm:py-4 font-semibold min-w-[150px]">Nội dung</th>
                <th className="px-2 py-3 sm:px-6 sm:py-4 text-right font-semibold whitespace-nowrap">Số tiền</th>
                <th className="px-2 py-3 sm:px-6 sm:py-4 text-center font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((tx) => (
                <tr key={tx.id} className="sm:hover:bg-slate-50/80 transition-colors group bg-white">
                  <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-gray-500 font-medium">
                    {new Date(tx.date).getDate()}/{new Date(tx.date).getMonth() + 1}
                    {tx.isIncurred && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-orange-400" title="Chi phí phát sinh"></span>}
                    {tx.isRecurring && <span className="ml-2 text-blue-500" title="Tự động"><Repeat size={12} className="inline"/></span>}
                  </td>
                  <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap"><Badge color={allCategories.find(c => c.id === tx.category)?.color || '#999'}>{allCategories.find(c => c.id === tx.category)?.name}</Badge></td>
                  <td className="px-2 py-3 sm:px-6 sm:py-4 text-gray-800 font-medium break-words max-w-[200px]">{tx.note}</td>
                  <td className="px-2 py-3 sm:px-6 sm:py-4 text-right font-bold text-gray-800 whitespace-nowrap">{formatCurrency(tx.amount)}</td>
                  <td className="px-2 py-3 sm:px-6 sm:py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => onEdit(tx)} 
                        className="text-gray-300 sm:hover:text-blue-500 p-2 rounded-full sm:hover:bg-blue-50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-125 active:bg-blue-100 active:text-blue-600"
                        title="Chỉnh sửa"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => deleteTransaction(tx.id)} 
                        className="text-gray-300 sm:hover:text-red-500 p-2 rounded-full sm:hover:bg-red-50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-125 active:bg-red-100 active:text-red-600"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 bg-white"><div className="flex flex-col items-center justify-center text-gray-300 gap-2"><Search size={40} strokeWidth={1} /><p className="text-sm">Không tìm thấy giao dịch nào</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// --- COMPONENT: BUDGET CONTENT ---
const BudgetContent = ({ 
  budgets, setBudgets, saveBudgetsToDb, allCategories, onAddCategory, 
  categoryVisibility, toggleVisibility, 
  categoryAlerts, toggleAlert, deleteCustomCategory
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', budget: '' });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCat.name || !newCat.budget) return;
    await onAddCategory(newCat);
    setShowAddModal(false);
    setNewCat({ name: '', budget: '' });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div><h3 className="text-2xl font-bold text-gray-800">Cài đặt hạn mức chi tiêu</h3><p className="text-gray-500">Đặt giới hạn cho từng danh mục để nhận cảnh báo khi vượt quá</p></div>
          <button 
            onClick={() => saveBudgetsToDb(budgets)} 
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl sm:hover:bg-black font-bold shadow-lg transition-all active:scale-95 active:bg-black w-full md:w-auto justify-center"
          >
            <Save size={18} /> Lưu thay đổi
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allCategories.map(cat => {
          const currentVal = budgets[cat.id] || 0;
          const isVisible = categoryVisibility[cat.id] !== false; 
          const isAlertOn = categoryAlerts[cat.id] !== false; 
          const isCustom = cat.id.startsWith('custom_'); 

          return (
            <div key={cat.id} className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sm:hover:shadow-md transition-all group relative overflow-hidden ${!isVisible ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                {isCustom && (
                  <button 
                    onClick={() => deleteCustomCategory(cat.id)}
                    className="p-2 rounded-full shadow-sm transition-colors bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600"
                    title="Xóa danh mục"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  onClick={() => toggleAlert(cat.id)}
                  className={`p-2 rounded-full shadow-sm transition-colors ${isAlertOn ? 'bg-white text-yellow-500 hover:bg-yellow-50' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  title={isAlertOn ? "Đang bật cảnh báo" : "Đã tắt cảnh báo"}
                >
                  {isAlertOn ? <Bell size={16} /> : <BellOff size={16} />}
                </button>
                <button 
                  onClick={() => toggleVisibility(cat.id)}
                  className={`p-2 rounded-full shadow-sm transition-colors ${isVisible ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  title={isVisible ? "Đang hiển thị" : "Đã ẩn"}
                >
                  {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between mt-2">
                  <div className="mb-4">
                    <div className="w-10 h-2 rounded-full mb-3" style={{backgroundColor: cat.color}}></div>
                    <h4 className="font-bold text-lg text-gray-800">{cat.name}</h4>
                  </div>
                  <div className="relative mt-auto">
                      <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Hạn mức tháng</label>
                      <input type="number" className="w-full text-xl font-bold border-b-2 border-slate-100 focus:border-gray-800 outline-none py-2 transition-colors bg-transparent text-gray-800" value={currentVal === 0 ? '' : currentVal} onChange={(e) => setBudgets({...budgets, [cat.id]: Number(e.target.value)})} placeholder="0" />
                      <span className="absolute right-0 bottom-3 text-xs text-gray-400 font-bold">đ</span>
                  </div>
              </div>
            </div>
          )
        })}
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-gray-400 sm:hover:text-blue-600 sm:hover:border-blue-300 sm:hover:bg-blue-50/50 transition-all min-h-[240px] group active:scale-[0.98]"
        >
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <PlusCircle size={32} className="group-hover:text-blue-600" />
          </div>
          <span className="font-bold">Thêm danh mục mới</span>
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Tạo danh mục mới</h3>
                <button onClick={() => setShowAddModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18}/></button>
             </div>
             <form onSubmit={handleAdd} className="p-6 space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên danh mục</label>
                   <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="Ví dụ: Du lịch, Thú cưng..." value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hạn mức dự kiến</label>
                   <input required type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="0" value={newCat.budget} onChange={e => setNewCat({...newCat, budget: e.target.value})} />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">Tạo danh mục</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: RECURRING EXPENSES ---
const RecurringContent = ({ 
  recurringItems, addRecurringItem, updateRecurringItem, deleteRecurringItem, allCategories 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 
  const [formData, setFormData] = useState({ 
    name: '', amount: '', category: 'living', day: '1', 
    durationMonths: '', 
    isLifetime: true,
    durationType: 'months'
  });

  const resetForm = () => {
    setFormData({ 
      name: '', amount: '', category: 'living', day: '1', 
      durationMonths: '', 
      isLifetime: true,
      durationType: 'months'
    });
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      amount: item.amount,
      category: item.category,
      day: item.day,
      durationMonths: item.durationMonths || '',
      isLifetime: !item.durationMonths,
      durationType: 'months' 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    let finalDuration = null;
    if (!formData.isLifetime && formData.durationMonths) {
      finalDuration = Number(formData.durationMonths);
      if (formData.durationType === 'years') finalDuration *= 12;
    }

    const payload = {
      name: formData.name,
      amount: Number(formData.amount),
      category: formData.category,
      day: Number(formData.day),
      durationMonths: finalDuration,
      startDate: editingItem ? editingItem.startDate : new Date().toISOString()
    };

    if (editingItem) {
      await updateRecurringItem(editingItem.id, payload);
    } else {
      await addRecurringItem(payload);
    }

    setShowModal(false);
    resetForm();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">Chi tiêu cố định <Repeat size={24} className="text-blue-500"/></h3>
          <p className="text-gray-500">Tự động tạo giao dịch cho các khoản chi hàng tháng</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }} 
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl sm:hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 w-full md:w-auto justify-center"
        >
          <PlusCircle size={18} /> Thêm lịch chi tiêu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recurringItems.map(item => {
          const category = allCategories.find(c => c.id === item.category);
          const startDate = new Date(item.startDate);
          const now = new Date();
          const monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
          const isExpired = item.durationMonths && monthsPassed >= item.durationMonths;

          return (
            <div key={item.id} className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative group overflow-hidden hover:shadow-md transition-all ${isExpired ? 'opacity-60 grayscale-[0.8]' : ''}`}>
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Repeat size={100} />
               </div>
               
               <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                     <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: category?.color || '#999' }}></div>
                     <div className="flex gap-1 -mr-2 -mt-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="text-gray-300 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => deleteRecurringItem(item.id)}
                          className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                  </div>
                  
                  <h4 className="font-bold text-lg text-gray-800 mb-1 line-clamp-1 mt-2">
                    {item.name} {isExpired && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full ml-1">(Đã hết hạn)</span>}
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">{category?.name}</p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-50 space-y-2">
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(item.amount)}</p>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-slate-50 py-1.5 px-3 rounded-lg w-fit">
                        <CalendarClock size={14} /> 
                        Ngày {item.day} hàng tháng
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-slate-50 py-1.5 px-3 rounded-lg w-fit">
                        <CheckCircle2 size={14} className={item.durationMonths ? "text-orange-500" : "text-green-500"} /> 
                        {item.durationMonths ? `Kéo dài ${item.durationMonths} tháng` : 'Trọn đời'}
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          );
        })}
        
        {recurringItems.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
             <Repeat size={48} className="mb-4 opacity-20" />
             <p>Chưa có khoản chi cố định nào.</p>
             <button onClick={() => { resetForm(); setShowModal(true); }} className="text-blue-600 font-bold hover:underline mt-2">Tạo ngay</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-gray-800">{editingItem ? 'Chỉnh sửa khoản chi' : 'Thêm khoản chi cố định'}</h3>
                <button onClick={() => setShowModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18}/></button>
             </div>
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên khoản chi</label>
                   <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="Ví dụ: Tiền nhà, Internet..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số tiền hàng tháng</label>
                   <input required type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Danh mục</label>
                    <select className="custom-select w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày lên sổ</label>
                    <select className="custom-select w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white" value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})}>
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>Ngày {d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Thời gian áp dụng</label>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, isLifetime: true})}
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.isLifetime ? 'bg-white border-blue-500 text-blue-600 shadow-sm ring-1 ring-blue-500' : 'bg-transparent border-slate-200 text-gray-500 hover:bg-white hover:border-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.isLifetime ? 'border-blue-500' : 'border-gray-400'}`}>
                        {formData.isLifetime && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                      </div>
                      Trọn đời
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, isLifetime: false})}
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${!formData.isLifetime ? 'bg-white border-blue-500 text-blue-600 shadow-sm ring-1 ring-blue-500' : 'bg-transparent border-slate-200 text-gray-500 hover:bg-white hover:border-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!formData.isLifetime ? 'border-blue-500' : 'border-gray-400'}`}>
                        {!formData.isLifetime && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                      </div>
                      Có thời hạn
                    </button>
                  </div>
                  
                  {!formData.isLifetime && (
                    <div className="flex gap-3 animate-fade-in pt-1">
                       <div className="relative flex-1">
                         <input 
                           type="number" 
                           required 
                           min="1"
                           className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold text-gray-700"
                           placeholder="Nhập số lượng..."
                           value={formData.durationMonths}
                           onChange={e => setFormData({...formData, durationMonths: e.target.value})}
                         />
                       </div>
                       <div className="w-1/3">
                         <select 
                           className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-sm font-bold text-gray-700 h-full"
                           value={formData.durationType}
                           onChange={e => setFormData({...formData, durationType: e.target.value})}
                         >
                           <option value="months">Tháng</option>
                           <option value="years">Năm</option>
                         </select>
                       </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">
                    {editingItem ? 'Cập nhật' : 'Lưu thiết lập'}
                  </button>
                  <p className="text-xs text-center text-gray-400 mt-3">Hệ thống sẽ tự động tạo giao dịch khi đến ngày này hàng tháng.</p>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- NEW COMPONENT: DEBT AUDIT CONTENT ---
const DebtAuditContent = ({ transactions, allMonthlyIncome }) => {
  const stats = useMemo(() => {
    const monthlyData = {};

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyData[key]) monthlyData[key] = { spent: 0, income: 0, month: d.getMonth(), year: d.getFullYear() };
      monthlyData[key].spent += Number(tx.amount);
    });

    Object.keys(allMonthlyIncome).forEach(key => {
      if (!monthlyData[key]) {
        const [year, month] = key.split('-');
        monthlyData[key] = { spent: 0, income: 0, month: parseInt(month), year: parseInt(year) };
      }
      monthlyData[key].income = allMonthlyIncome[key];
    });

    const list = Object.values(monthlyData).map(item => ({
      ...item,
      balance: item.income - item.spent
    })).sort((a, b) => {
       if (b.year !== a.year) return b.year - a.year;
       return b.month - a.month;
    });

    const totalBalance = list.reduce((sum, item) => sum + item.balance, 0);

    return { list, totalBalance };
  }, [transactions, allMonthlyIncome]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <Card className={`${stats.totalBalance >= 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white border-none shadow-lg`}>
         <div className="flex flex-col items-center justify-center py-6">
            <h3 className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-2">Tổng tích lũy (Dư/Nợ)</h3>
            <div className="text-4xl font-bold flex items-center gap-2">
              {stats.totalBalance >= 0 ? <TrendingUp size={36} /> : <TrendingDown size={36} />}
              {formatCurrency(stats.totalBalance)}
            </div>
            <p className="mt-2 opacity-80 text-sm">Tính trên tất cả các tháng đã ghi nhận</p>
         </div>
      </Card>

      <Card className="p-0 overflow-hidden border-0 shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
           <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><ClipboardList size={20}/></div>
           <h3 className="font-bold text-gray-800">Bảng kê chi tiết theo tháng</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold">Tháng</th>
                <th className="px-6 py-4 font-bold text-right text-green-600">Thu nhập</th>
                <th className="px-6 py-4 font-bold text-right text-blue-600">Chi tiêu</th>
                <th className="px-6 py-4 font-bold text-right">Dư / Thiếu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.list.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors bg-white">
                  <td className="px-6 py-4 font-bold text-gray-700">Tháng {item.month + 1}/{item.year}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-600">{formatCurrency(item.income)}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-600">{formatCurrency(item.spent)}</td>
                  <td className={`px-6 py-4 text-right font-bold ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.balance > 0 ? '+' : ''}{formatCurrency(item.balance)}
                  </td>
                </tr>
              ))}
              {stats.list.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState(INITIAL_BUDGETS);
  const [monthlyIncome, setMonthlyIncome] = useState(0); 
  const [allMonthlyIncome, setAllMonthlyIncome] = useState({});
  const [customCategoryConfig, setCustomCategoryConfig] = useState({}); 
  const [categoryVisibility, setCategoryVisibility] = useState({}); 
  const [categoryAlerts, setCategoryAlerts] = useState({}); 
  const [noteStats, setNoteStats] = useState({});
  const [recurringItems, setRecurringItems] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null); 
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // --- FILTER STATE ---
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [chartMode, setChartMode] = useState('daily');
  const [chartCategoryFilter, setChartCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [notification, setNotification] = useState(null);
  const notificationTimeoutRef = React.useRef(null);

  const showSuccess = (msg) => {
     if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
     setNotification(msg);
     notificationTimeoutRef.current = setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    // Logic kiểm tra token tùy chỉnh (nếu có tích hợp từ server khác)
    const checkCustomToken = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (error) {
          console.error("Lỗi token tùy chỉnh:", error);
        }
      }
    };
    
    // Gọi hàm kiểm tra token (nhưng KHÔNG tự động sign in anonymous ở đây nữa)
    checkCustomToken();
    
    // Lắng nghe trạng thái đăng nhập từ Firebase
    // Firebase sẽ tự động kiểm tra LocalStorage để khôi phục user cũ (nếu có)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
      setIsMobileMenuOpen(false); 
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setBudgets(INITIAL_BUDGETS);
      setRecurringItems([]);
      setMonthlyIncome(0);
      return;
    }
    setIsLoading(true);

    const paths = getFirestorePaths(user);
    if (!paths) return;
    
    const unsubTx = onSnapshot(query(paths.transactions), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // --- CẬP NHẬT LOGIC SẮP XẾP ---
      data.sort((a, b) => {
        // 1. So sánh theo ngày giao dịch (Date chọn trên lịch)
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        if (dateB !== dateA) {
          return dateB - dateA; // Ngày lớn hơn (mới hơn) xếp trước
        }
        
        // 2. Nếu cùng ngày, so sánh theo thời gian tạo thực tế (createdAt)
        // Lưu ý: createdAt có thể null giây lát khi vừa tạo xong (latency compensation)
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        
        return timeB - timeA; // Tạo sau (mới hơn) xếp trước
      });
      // -------------------------------

      setTransactions(data);
      setIsLoading(false);
    }, (e) => { console.error(e); setIsLoading(false); });

    const unsubBudget = onSnapshot(paths.budgetConfig, (s) => s.exists() && setBudgets(s.data()));
    
    const unsubCustomCats = onSnapshot(paths.categories, (s) => {
      if (s.exists()) setCustomCategoryConfig(s.data());
    });
    const unsubVisibility = onSnapshot(paths.visibility, (s) => {
      if (s.exists()) setCategoryVisibility(s.data());
    });
    const unsubAlerts = onSnapshot(paths.alerts, (s) => {
      if (s.exists()) setCategoryAlerts(s.data());
    });
    const unsubNotes = onSnapshot(paths.notes, (s) => s.exists() && setNoteStats(s.data()));

    const unsubRecurring = onSnapshot(paths.recurring, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecurringItems(data);
    });

    return () => { 
      unsubTx(); unsubBudget(); unsubNotes(); unsubCustomCats(); 
      unsubVisibility(); unsubAlerts(); unsubRecurring(); 
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    if (!paths) return;

    const unsubMonthlyStats = onSnapshot(paths.monthlyStats(viewYear, viewMonth), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setMonthlyIncome(docSnapshot.data().income || 0);
      } else {
        setMonthlyIncome(0);
      }
    });

    const unsubAllStats = onSnapshot(paths.allMonthlyStats, (snapshot) => {
       const data = {};
       snapshot.forEach(doc => {
         data[doc.id] = doc.data().income || 0;
       });
       setAllMonthlyIncome(data);
    });

    return () => { unsubMonthlyStats(); unsubAllStats(); };
  }, [user, viewMonth, viewYear]);

  useEffect(() => {
    if (!user || recurringItems.length === 0) return;

    const checkAndExecuteRecurring = async () => {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`; 
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const paths = getFirestorePaths(user);

      recurringItems.forEach(async (item) => {
        if (item.durationMonths) {
            const startDate = new Date(item.startDate);
            const monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
            if (monthsPassed >= item.durationMonths) {
                return;
            }
        }

        if (item.lastExecuted === currentMonthKey) return;

        const targetDay = Math.min(item.day, daysInMonth);

        if (now.getDate() >= targetDay) {
          try {
             await addDoc(paths.transactions, {
               amount: item.amount,
               category: item.category,
               date: new Date().toISOString().split('T')[0], 
               note: `${item.name} (Tự động)`,
               createdAt: serverTimestamp(),
               isRecurring: true
             });

             const itemRef = doc(paths.recurring, item.id);
             await updateDoc(itemRef, {
               lastExecuted: currentMonthKey
             });
             
             console.log(`Executed recurring expense: ${item.name}`);
          } catch (error) {
            console.error("Error executing recurring expense:", error);
          }
        }
      });
    };

    checkAndExecuteRecurring();
  }, [recurringItems, user]);

  const allCategories = useMemo(() => {
    const mergedConfig = { ...DEFAULT_CATEGORY_CONFIG, ...customCategoryConfig };
    return Object.keys(mergedConfig).map(key => ({
      id: key,
      name: mergedConfig[key].label,
      color: mergedConfig[key].color,
      icon: ICON_LIBRARY[mergedConfig[key].icon] || Star 
    }));
  }, [customCategoryConfig]);

  const addTransaction = async (newTx) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    await addDoc(paths.transactions, { ...newTx, createdAt: serverTimestamp() });
    
    if (newTx.note?.trim()) {
      const cleanNote = newTx.note.trim().replace(/\./g, '');
      if (cleanNote) await setDoc(paths.notes, { [cleanNote]: increment(1) }, { merge: true });
    }
  };

  const updateTransaction = async (id, updatedTx) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    const cleanTx = Object.fromEntries(Object.entries(updatedTx).filter(([_, v]) => v !== undefined));
    await updateDoc(doc(paths.transactions, id), cleanTx);
    showSuccess("Đã cập nhật giao dịch thành công!");
  };

  const deleteTransaction = async (id) => {
    if (!user || !confirm('Bạn có chắc muốn xóa giao dịch này?')) return;
    const paths = getFirestorePaths(user);
    await deleteDoc(doc(paths.transactions, id));
  };

  const saveBudgetsToDb = async (newBudgets) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    await setDoc(paths.budgetConfig, newBudgets);
    showSuccess("Đã cập nhật hạn mức danh mục thành công!");
  };

  const updateMonthlyIncome = async (amount) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    await setDoc(paths.monthlyStats(viewYear, viewMonth), { income: amount }, { merge: true });
    showSuccess(`Đã cập nhật thu nhập tháng ${viewMonth + 1}/${viewYear}`);
  };

  const addNewCategory = async ({ name, budget }) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    const id = `custom_${Date.now()}`;
    const randomColor = getRandomColor();

    await setDoc(paths.categories, {
      [id]: { label: name, color: randomColor }
    }, { merge: true });
    
    await setDoc(paths.budgetConfig, {
      [id]: Number(budget)
    }, { merge: true });
    showSuccess("Đã thêm danh mục mới thành công!");
  };

  const deleteCustomCategory = async (id) => {
    if (!user || !confirm('Bạn có chắc muốn xóa danh mục này?')) return;
    const paths = getFirestorePaths(user);
    await updateDoc(paths.categories, { [id]: deleteField() });
    await updateDoc(paths.budgetConfig, { [id]: deleteField() });
    try { await updateDoc(paths.visibility, { [id]: deleteField() }); } catch(e) {}
    try { await updateDoc(paths.alerts, { [id]: deleteField() }); } catch(e) {}
  };

  const toggleVisibility = async (id) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    const currentStatus = categoryVisibility[id] !== false; 
    await setDoc(paths.visibility, { [id]: !currentStatus }, { merge: true });
  };

  const toggleAlert = async (id) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    const currentStatus = categoryAlerts[id] !== false; 
    await setDoc(paths.alerts, { [id]: !currentStatus }, { merge: true });
  };

  const addRecurringItem = async (item) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    await addDoc(paths.recurring, {
      ...item,
      amount: Number(item.amount),
      day: Number(item.day),
      lastExecuted: '', 
      startDate: new Date().toISOString()
    });
    showSuccess("Đã thêm lịch chi tiêu cố định thành công!");
  };

  const updateRecurringItem = async (id, updatedData) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    await updateDoc(doc(paths.recurring, id), updatedData);
    showSuccess("Đã cập nhật lịch chi tiêu cố định thành công!");
  }

  const deleteRecurringItem = async (id) => {
    if (!user || !confirm('Xóa khoản chi cố định này?')) return;
    const paths = getFirestorePaths(user);
    await deleteDoc(doc(paths.recurring, id));
  };

  const handleLogout = async () => {
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      await signOut(auth);
    }
  };

  // --- MEMOIZED DATA CALCULATIONS ---
  const currentMonthTransactions = useMemo(() => transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === parseInt(viewMonth) && d.getFullYear() === parseInt(viewYear);
  }), [transactions, viewMonth, viewYear]);

  const previousMonthData = useMemo(() => {
    const prevDate = new Date(viewYear, parseInt(viewMonth) - 1, 1);
    const pTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevDate.getMonth() && d.getFullYear() === prevDate.getFullYear();
    });
    return { total: pTransactions.reduce((sum, t) => sum + Number(t.amount), 0) };
  }, [transactions, viewMonth, viewYear]);

  const currentYearTransactions = useMemo(() => transactions.filter(t => new Date(t.date).getFullYear() === parseInt(viewYear)), [transactions, viewYear]);

  const totalSpent = currentMonthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const spendingDiff = totalSpent - previousMonthData.total;
  const totalIncurred = currentMonthTransactions.filter(t => t.isIncurred).reduce((sum, t) => sum + Number(t.amount), 0);

  const spendingByCategory = useMemo(() => {
    const data = {};
    allCategories.forEach(c => data[c.id] = 0);
    currentMonthTransactions.forEach(t => { if (data[t.category] !== undefined) data[t.category] += Number(t.amount); });
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    
    let result = allCategories.map(cat => ({
        id: cat.id, name: cat.name, value: data[cat.id] || 0, color: cat.color,
        budget: budgets[cat.id] || 0, percentage: total > 0 ? ((data[cat.id] || 0) / total) * 100 : 0
    }));

    return result.filter(item => categoryVisibility[item.id] !== false).sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions, budgets, allCategories, categoryVisibility]);

  const dailySpendingData = useMemo(() => {
    const days = new Date(viewYear, parseInt(viewMonth) + 1, 0).getDate();
    const data = Array.from({ length: days }, (_, i) => ({ name: i + 1, amount: 0, fullLabel: `Ngày ${i + 1}/${parseInt(viewMonth) + 1}` }));
    currentMonthTransactions.forEach(t => {
      if (categoryVisibility[t.category] === false) return; 
      if (chartCategoryFilter !== 'all' && t.category !== chartCategoryFilter) return;
      const day = new Date(t.date).getDate() - 1;
      if (data[day]) data[day].amount += Number(t.amount);
    });
    return data;
  }, [currentMonthTransactions, viewMonth, viewYear, chartCategoryFilter, categoryVisibility]);

  const monthlySpendingData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({ name: `T${i + 1}`, amount: 0, fullLabel: `Tháng ${i + 1}/${viewYear}` }));
    currentYearTransactions.forEach(t => {
      if (categoryVisibility[t.category] === false) return;
      if (chartCategoryFilter !== 'all' && t.category !== chartCategoryFilter) return;
      const m = new Date(t.date).getMonth();
      if (data[m]) data[m].amount += Number(t.amount);
    });
    return data;
  }, [currentYearTransactions, viewYear, chartCategoryFilter, categoryVisibility]);

  const alerts = useMemo(() => {
    const results = [];
    spendingByCategory.forEach(item => {
      if (item.budget > 0 && categoryAlerts[item.id] !== false) {
        const ratio = item.value / item.budget;
        if (ratio >= 1) results.push({ id: item.id, name: item.name, ratio, type: 'danger', message: `Đã hết hạn mức ${item.name}` });
        else if (ratio >= 0.8) results.push({ id: item.id, name: item.name, ratio, type: 'warning', message: `${item.name} sắp hết hạn mức` });
      }
    });
    return results;
  }, [spendingByCategory, categoryAlerts]);

  const filteredTransactions = useMemo(() => currentMonthTransactions.filter(t => {
    const note = t.note ? t.note.toLowerCase() : '';
    const amount = t.amount ? t.amount.toString() : '';
    return (note.includes(search.toLowerCase()) || amount.includes(search)) && (filterCategory === 'all' || t.category === filterCategory);
  }), [currentMonthTransactions, search, filterCategory]);

  const AddTransactionModal = ({ onClose, transactionToEdit }) => {
    const [mode, setMode] = useState(transactionToEdit ? 'simple' : 'simple'); 
    
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const [formData, setFormData] = useState(transactionToEdit ? {
      date: transactionToEdit.date,
      amount: transactionToEdit.amount,
      category: transactionToEdit.category,
      note: transactionToEdit.note,
      isIncurred: transactionToEdit.isIncurred || false
    } : { 
      date: new Date().toISOString().split('T')[0], 
      amount: '', 
      category: 'eating', 
      note: '', 
      isIncurred: false 
    });
    
    const [advancedDate, setAdvancedDate] = useState(new Date().toISOString().split('T')[0]);
    const [advancedItems, setAdvancedItems] = useState([
      { amount: '', category: 'eating', note: '', isIncurred: false }
    ]);
    const [activeRowIndex, setActiveRowIndex] = useState(null); 

    const [suggestions, setSuggestions] = useState([]);
    
    const handleNoteChange = (e, index = null) => {
      const val = e.target.value;
      if (mode === 'simple') {
        setFormData({...formData, note: val});
      } else {
        const newItems = [...advancedItems];
        newItems[index].note = val;
        setAdvancedItems(newItems);
        setActiveRowIndex(index); 
      }

      if (val.length >= 3) {
        const matches = Object.entries(noteStats).filter(([n, c]) => c >= 2 && n.toLowerCase().includes(val.toLowerCase())).sort((a,b)=>b[1]-a[1]).map(([n])=>n).slice(0,5);
        setSuggestions(matches);
      } else setSuggestions([]);
    };

    const handleSelectSuggestion = (val, index = null) => {
        if (mode === 'simple') {
            setFormData({...formData, note: val});
        } else {
            const newItems = [...advancedItems];
            newItems[index].note = val;
            setAdvancedItems(newItems);
        }
        setSuggestions([]);
        setActiveRowIndex(null);
    }

    const handleSubmitSimple = async (e) => { 
      e.preventDefault(); 
      if (!formData.amount || !formData.date) return; 
      
      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, formData);
      } else {
        await addTransaction(formData); 
        showSuccess("Đã thêm giao dịch mới thành công!");
      }
      onClose(); 
    };

    const handleSubmitAdvanced = async (e) => {
      e.preventDefault();
      const validItems = advancedItems.filter(item => item.amount && Number(item.amount) > 0);
      if (validItems.length === 0) return;

      await Promise.all(validItems.map(item => addTransaction({
        ...item,
        date: advancedDate
      })));
      
      showSuccess(`Đã thêm thành công ${validItems.length} giao dịch!`);
      onClose();
    };

    const addAdvancedRow = () => {
      setAdvancedItems([...advancedItems, { amount: '', category: 'eating', note: '', isIncurred: false }]);
    };

    const removeAdvancedRow = (index) => {
      if (advancedItems.length === 1) return;
      const newItems = advancedItems.filter((_, i) => i !== index);
      setAdvancedItems(newItems);
    };

    const updateAdvancedItem = (index, field, value) => {
      const newItems = [...advancedItems];
      newItems[index][field] = value;
      setAdvancedItems(newItems);
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-hidden">
        <div className={`bg-white rounded-2xl shadow-2xl w-full ${mode === 'advanced' ? 'max-w-2xl' : 'max-w-md'} animate-scale-in overflow-hidden my-4 transition-all duration-300 flex flex-col max-h-[90vh]`}>
          <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-800">{transactionToEdit ? 'Cập nhật giao dịch' : 'Thêm giao dịch'}</h3>
              {!transactionToEdit && (
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button 
                    onClick={() => setMode('simple')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === 'simple' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Đơn giản
                  </button>
                  <button 
                    onClick={() => setMode('advanced')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === 'advanced' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Nâng cao
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="bg-gray-100 sm:hover:bg-gray-200 p-2 rounded-full transition-colors active:scale-90 active:bg-gray-200"
            >
              <X size={18} className="text-gray-600"/>
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-6">
            {mode === 'simple' ? (
              <form onSubmit={handleSubmitSimple} className="space-y-5">
                {/* Row 1: Amount + Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Số tiền</label>
                    <input type="number" required className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 outline-none text-xl font-bold text-gray-800 transition-all bg-slate-50 focus:bg-white" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0" autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Danh mục</label>
                    <select className="custom-select w-full p-3 border-2 border-slate-100 rounded-xl focus:ring-0 focus:border-blue-500 outline-none bg-white text-base font-medium text-gray-700 h-[56px]" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 2: Date + Incurred */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ngày</label>
                    <input type="date" required className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-medium text-gray-700" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="flex items-end">
                    <div 
                      className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer active:scale-[0.98] ${formData.isIncurred ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-gray-600'}`} 
                      onClick={() => setFormData({...formData, isIncurred: !formData.isIncurred})}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.isIncurred ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`}>{formData.isIncurred && <X size={12} className="text-white" />}</div>
                      <span className="text-sm font-bold select-none">Phát sinh</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: Note */}
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Nội dung</label>
                  <input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-base sm:text-sm font-medium text-gray-700 placeholder:text-gray-300" value={formData.note} onChange={handleNoteChange} placeholder="Nhập ghi chú..." />
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-100 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto animate-fade-in py-2">
                      {suggestions.map((s, idx) => (
                        <div key={idx} onClick={() => handleSelectSuggestion(s)} className="px-4 py-2 sm:hover:bg-slate-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2 active:bg-gray-100"><List size={14} className="text-gray-400" />{s}</div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold sm:hover:bg-blue-700 shadow-lg shadow-blue-200 transform active:scale-[0.98] active:bg-blue-700 transition-all mt-4"
                >
                  {transactionToEdit ? 'Lưu Thay Đổi' : 'Lưu Giao Dịch'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitAdvanced} className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-center gap-4">
                  <label className="text-sm font-bold text-blue-800 whitespace-nowrap">Chọn ngày áp dụng chung:</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full sm:w-auto p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-sm font-medium text-gray-700" 
                    value={advancedDate} 
                    onChange={e => setAdvancedDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-4">
                  {advancedItems.map((item, index) => (
                    <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative group">
                      <div className="absolute -left-2 -top-2 bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 border border-white shadow-sm">{index + 1}</div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <div className="w-1/2">
                            <input type="number" placeholder="Số tiền" className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-500 outline-none" value={item.amount} onChange={(e) => updateAdvancedItem(index, 'amount', e.target.value)} required />
                          </div>
                          <div className="w-1/2">
                            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-500 outline-none" value={item.category} onChange={(e) => updateAdvancedItem(index, 'category', e.target.value)}>
                              {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="relative">
                            <input type="text" placeholder="Nội dung chi tiêu..." className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" value={item.note} onChange={(e) => handleNoteChange(e, index)} onFocus={() => setActiveRowIndex(index)} />
                            {suggestions.length > 0 && activeRowIndex === index && (
                                <div className="absolute z-50 w-full bg-white border border-gray-100 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto animate-fade-in py-2">
                                {suggestions.map((s, idx) => (
                                    <div key={idx} onClick={() => handleSelectSuggestion(s, index)} className="px-4 py-2 sm:hover:bg-slate-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2 active:bg-gray-100"><List size={14} className="text-gray-400" />{s}</div>
                                ))}
                                </div>
                            )}
                        </div>
                      </div>
                      {advancedItems.length > 1 && (
                        <button type="button" onClick={() => removeAdvancedRow(index)} className="absolute -right-2 -top-2 p-1.5 bg-white text-red-400 hover:text-red-600 border border-gray-200 rounded-full shadow-sm" title="Xóa dòng này"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={addAdvancedRow} className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors active:scale-95 whitespace-nowrap"><Plus size={18} /> <span className="hidden sm:inline">Thêm dòng</span></button>
                  <button type="submit" className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-black shadow-lg shadow-gray-300 transition-all active:scale-[0.98]">Lưu tất cả ({advancedItems.filter(i => i.amount).length})</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SidebarItem = ({ id, label, icon: Icon, active }) => (
    <button onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium active:bg-gray-200 active:scale-[0.98] ${active ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 sm:hover:bg-gray-100 sm:hover:text-gray-900'}`}>
      <Icon size={20} className={active ? 'text-white' : 'text-gray-400'} /> {label}
    </button>
  );

  const FilterBar = () => (
    <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 w-full sm:w-auto justify-between sm:justify-start">
      <div className="flex items-center gap-2">
        <Calendar size={18} className="text-gray-400" />
        <select value={viewMonth} onChange={(e) => setViewMonth(parseInt(e.target.value))} className="custom-select p-1 pr-8 text-base sm:text-sm font-semibold text-gray-700 bg-transparent outline-none cursor-pointer sm:hover:bg-gray-50 rounded">
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>Tháng {i + 1}</option>)}
        </select>
      </div>
      <span className="text-gray-200">|</span>
      <select value={viewYear} onChange={(e) => setViewYear(parseInt(e.target.value))} className="custom-select p-1 pr-8 text-base sm:text-sm font-semibold text-gray-700 bg-transparent outline-none cursor-pointer sm:hover:bg-gray-50 rounded">
        {Array.from({ length: 5 }, (_, i) => <option key={i} value={new Date().getFullYear() - 2 + i}>{new Date().getFullYear() - 2 + i}</option>)}
      </select>
    </div>
  );

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const getUserName = () => {
    if (!user) return '';
    if (user.isAnonymous) return 'Demo User';
    return user.displayName || user.email?.split('@')[0] || 'Người dùng';
  };
  const userName = getUserName();
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 bg-slate-50 text-gray-800 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      <style>{`
        html, body { -webkit-tap-highlight-color: transparent; }
        button, a, input, select { touch-action: manipulation; user-select: none; }
        
        select:focus { outline: none !important; box-shadow: none !important; border-color: inherit !important; }
        select:focus-visible { outline: none !important; box-shadow: none !important; }
        button:focus-visible { outline: 2px solid #3B82F6; outline-offset: 2px; }
        button:focus:not(:focus-visible), select:focus:not(:focus-visible) { outline: none; }
        
        input[type="date"], input[type="number"], input[type="text"], select {
          -webkit-appearance: none; -moz-appearance: none; appearance: none;
          border-radius: 0.75rem; font-size: 16px;
        }

        .recharts-surface:focus { outline: none; }
        path.recharts-sector:focus, path.recharts-rectangle:focus, g.recharts-layer:focus, .recharts-wrapper:focus { outline: none !important; }

        .custom-select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
          background-size: 1em;
          padding-right: 2rem !important;
        }
        
        input[type="date"] {
          min-height: 48px; display: block; position: relative;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%223%22%20y%3D%224%22%20width%3D%2218%22%20height%3D%2218%22%20rx%3D%222%22%20ry%3D%222%22%3E%3C%2Frect%3E%3Cline%20x1%3D%2216%22%20y1%3D%222%22%20x2%3D%2216%22%20y2%3D%226%22%3E%3C%2Fline%3E%3Cline%20x1%3D%228%22%20y1%3D%222%22%20x2%3D%228%22%20y2%3D%226%22%3E%3C%2Fline%3E%3Cline%20x1%3D%223%22%20y1%3D%2210%22%20x2%3D%2221%22%20y2%3D%2210%22%3E%3C%2Fline%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25em; padding-right: 2.5rem;
        }
        input[type="date"]::-webkit-calendar-picker-indicator { position: absolute; right: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        
        input, select, textarea { -webkit-appearance: none; -webkit-border-radius: 0.75rem; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
      
      {/* Mobile Header */}
      <div className="flex-none md:hidden bg-white px-5 py-4 flex justify-between items-center z-40 border-b border-gray-100 shadow-sm">
        <h1 className="font-bold text-lg text-gray-900 flex items-center gap-2">{userName} {user.isAnonymous && <Globe size={16} className="text-blue-500" />}</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 sm:hover:bg-gray-100 active:bg-gray-200 rounded-lg text-gray-600 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden animate-fade-in backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl md:shadow-none pt-0`}>
        <div className="p-8 border-b border-slate-50 flex-none"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">{userInitial}</div><div><h1 className="font-extrabold text-xl text-gray-900 tracking-tight leading-none">{userName}</h1><p className="text-xs text-gray-400 font-medium mt-1">{user.isAnonymous ? 'Public Shared Dashboard' : 'Personal Finance'}</p></div></div></div>
        <nav className="p-6 space-y-2 flex-1 overflow-y-auto">
          <SidebarItem id="dashboard" label="Tổng quan" icon={LayoutDashboard} active={activeTab === 'dashboard'} />
          <SidebarItem id="transactions" label="Sổ giao dịch" icon={Receipt} active={activeTab === 'transactions'} />
          <SidebarItem id="recurring" label="Chi tiêu cố định" icon={Repeat} active={activeTab === 'recurring'} />
          <SidebarItem id="budget" label="Cài đặt hạn mức" icon={Settings} active={activeTab === 'budget'} />
          <div className="pt-4 border-t border-slate-50 mt-4">
             <SidebarItem id="debt" label="Dư nợ" icon={ClipboardList} active={activeTab === 'debt'} />
          </div>
        </nav>
        <div className="p-6 space-y-2 flex-none">
          <button 
            onClick={handleLogout}
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 p-4 rounded-2xl flex items-center gap-3 transition-colors font-medium active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-full bg-white text-slate-500 flex items-center justify-center shadow-sm"><LogOut size={16} /></div>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-50 w-full">
        <header className="bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200/50">
          <div className="flex items-center gap-4 w-full sm:w-auto">{(activeTab === 'dashboard' || activeTab === 'transactions') && <FilterBar />}</div>
          {activeTab !== 'debt' && (
            <button onClick={() => { setEditingTransaction(null); setShowAddModal(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 sm:hover:bg-black text-white px-5 py-2.5 rounded-xl shadow-lg shadow-gray-300 transition-all active:scale-95 font-bold text-sm"><PlusCircle size={18} /> <span className="sm:hidden md:inline">Thêm khoản chi</span></button>
          )}
        </header>

        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-300"><div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mb-6 opacity-20"></div><p className="font-medium animate-pulse">Đang đồng bộ dữ liệu...</p></div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardContent 
                  totalSpent={totalSpent} 
                  monthlyIncome={monthlyIncome} 
                  updateMonthlyIncome={updateMonthlyIncome} 
                  spendingDiff={spendingDiff} 
                  totalIncurred={totalIncurred} 
                  alerts={alerts} 
                  spendingByCategory={spendingByCategory} currentChartData={chartMode === 'daily' ? dailySpendingData : monthlySpendingData} 
                  chartMode={chartMode} setChartMode={setChartMode} 
                  chartCategoryFilter={chartCategoryFilter} setChartCategoryFilter={setChartCategoryFilter}
                  allCategories={allCategories}
                  categoryVisibility={categoryVisibility} 
                  userName={userName}
                  isPublic={user.isAnonymous}
                />
              )}
              {activeTab === 'transactions' && (
                <TransactionContent 
                  filtered={filteredTransactions} viewMonth={viewMonth} viewYear={viewYear} 
                  search={search} setSearch={setSearch} filterCategory={filterCategory} setFilterCategory={setFilterCategory} 
                  deleteTransaction={deleteTransaction}
                  onEdit={(tx) => { setEditingTransaction(tx); setShowAddModal(true); }}
                  allCategories={allCategories}
                />
              )}
              {activeTab === 'budget' && (
                <BudgetContent 
                  budgets={budgets} setBudgets={setBudgets} 
                  saveBudgetsToDb={saveBudgetsToDb} 
                  allCategories={allCategories}
                  onAddCategory={addNewCategory}
                  categoryVisibility={categoryVisibility}
                  toggleVisibility={toggleVisibility}
                  categoryAlerts={categoryAlerts} 
                  toggleAlert={toggleAlert} 
                  deleteCustomCategory={deleteCustomCategory} 
                />
              )}
              {activeTab === 'recurring' && (
                <RecurringContent 
                  recurringItems={recurringItems}
                  addRecurringItem={addRecurringItem}
                  updateRecurringItem={updateRecurringItem}
                  deleteRecurringItem={deleteRecurringItem}
                  allCategories={allCategories}
                />
              )}
              {activeTab === 'debt' && (
                <DebtAuditContent 
                  transactions={transactions}
                  allMonthlyIncome={allMonthlyIncome}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* --- SUCCESS NOTIFICATION TOAST --- */}
      {notification && (
        <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white border-l-4 border-green-500 shadow-2xl rounded-xl p-4 flex items-center gap-4 min-w-[300px] max-w-sm">
            <div className="bg-green-100 p-2 rounded-full text-green-600">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-sm">Thành công!</h4>
              <p className="text-gray-500 text-xs mt-0.5">{notification}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {showAddModal && <AddTransactionModal onClose={() => { setShowAddModal(false); setEditingTransaction(null); }} transactionToEdit={editingTransaction} />}
    </div>
  );
}