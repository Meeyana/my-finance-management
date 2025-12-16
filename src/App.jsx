import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList 
} from 'recharts';
import { 
  LayoutDashboard, Wallet, Receipt, PlusCircle, Settings, 
  TrendingUp, TrendingDown, Search, Trash2, Save,
  Menu, X, Database, Calendar, AlertCircle, BarChart2, ArrowUpRight, ArrowDownRight,
  List, AlertTriangle,
  Coffee, ShoppingBag, BookOpen, Home, Fuel, Film, MoreHorizontal, ChevronDown,
  // Icons for Category Config (Keep imports for logic, but hide in UI)
  Heart, Star, Gift, Music, Briefcase, Plane, Gamepad2, GraduationCap,
  Baby, Dog, Car, Zap, Wifi, Phone, Dumbbell,
  Eye, EyeOff, // Visibility icons
  Bell, BellOff // Alert icons
} from 'lucide-react';

// FIREBASE IMPORTS
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
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

// --- ICON LIBRARY FOR DYNAMIC MAPPING ---
// Still needed for rendering icons in other tabs (Dashboard/Transactions)
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
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatShortCurrency = (amount) => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'tr';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
  return amount;
};

// Random Color Generator
const getRandomColor = () => {
  const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', 
    '#8B5CF6', '#EC4899', '#F43F5E', '#84CC16', '#06B6D4',
    '#0EA5E9', '#64748B', '#A855F7', '#D946EF'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ color, children }) => (
  <span className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm whitespace-nowrap" style={{ backgroundColor: color }}>
    {children}
  </span>
);

// --- COMPONENT: DASHBOARD CONTENT ---
const DashboardContent = React.memo(({ 
  totalSpent, totalBudget, spendingDiff, totalIncurred, alerts, 
  spendingByCategory, currentChartData, chartMode, setChartMode, 
  chartCategoryFilter, setChartCategoryFilter, allCategories, categoryVisibility
}) => {
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCharts(true), 200);
    return () => clearTimeout(timer);
  }, []);

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
      <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Xin chào, Tuấn Phan</h2>
          <p className="text-gray-500">Đây là tình hình tài chính tháng này của bạn.</p>
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
        
        <Card>
           <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Ngân sách</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(totalBudget)}</h3>
            </div>
             <div className="p-2.5 bg-green-50 rounded-xl text-green-600"><Wallet size={24} /></div>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-green-500" style={{width: `${totalBudget > 0 ? Math.min((totalSpent/totalBudget)*100, 100) : 0}%`}}></div>
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

        <Card>
           <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Còn lại</p>
              <h3 className={`text-2xl font-bold mt-1 ${totalBudget - totalSpent < 0 ? 'text-red-600' : 'text-indigo-600'}`}>
                {formatCurrency(totalBudget - totalSpent)}
              </h3>
            </div>
             <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><TrendingUp size={24} /></div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`p-4 rounded-xl border-l-4 shadow-sm flex items-center gap-3 ${alert.type === 'danger' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-yellow-50 border-yellow-500 text-yellow-800'}`}>
              {alert.type === 'danger' ? <AlertCircle size={20} /> : <AlertTriangle size={20} />}
              <div className="flex-1">
                <p className="font-bold text-sm">{alert.message}</p>
                <p className="text-xs opacity-80">Đã dùng {(alert.ratio * 100).toFixed(0)}% ngân sách.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
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

        {/* Bar Chart */}
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
                <Bar dataKey="amount" fill={chartColor} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Actual vs Budget */}
      <Card>
        <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings size={20} className="text-gray-400" /> Thực tế vs Ngân sách</h4>
        <div className="h-[500px] w-full">
          {!showCharts ? (
             <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse"><p className="text-gray-400 text-sm">Đang tải biểu đồ...</p></div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            {/* UPDATED: Only show categories with actual spending > 0 */}
            <BarChart data={spendingByCategory.filter(item => item.value > 0)} layout="vertical" margin={{left: 40, right: 60}} barCategoryGap={24}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{fontSize: 12, fill: '#4B5563', fontWeight: 600}} width={80} axisLine={false} tickLine={false} />
              <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
              <Legend />
              <Bar dataKey="value" name="Thực tế" barSize={20} radius={[0, 6, 6, 0]} isAnimationActive={false} fill="#3B82F6">
                 <LabelList dataKey="value" position="right" formatter={(val) => val > 0 ? formatShortCurrency(val) : ''} style={{fontSize: '11px', fontWeight: 'bold', fill: '#6B7280'}} />
              </Bar>
              <Bar dataKey="budget" name="Ngân sách" fill="#F3F4F6" barSize={20} radius={[0, 6, 6, 0]} isAnimationActive={false}>
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
  filtered, viewMonth, viewYear, search, setSearch, filterCategory, setFilterCategory, deleteTransaction, allCategories
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
                <th className="px-6 py-4 font-semibold">Thời gian</th>
                <th className="px-6 py-4 font-semibold">Danh mục</th>
                <th className="px-6 py-4 font-semibold">Nội dung</th>
                <th className="px-6 py-4 text-right font-semibold">Số tiền</th>
                <th className="px-6 py-4 text-center font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((tx) => (
                <tr key={tx.id} className="sm:hover:bg-slate-50/80 transition-colors group bg-white">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">{new Date(tx.date).getDate()}/{new Date(tx.date).getMonth() + 1}{tx.isIncurred && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-orange-400" title="Chi phí phát sinh"></span>}</td>
                  <td className="px-6 py-4"><Badge color={allCategories.find(c => c.id === tx.category)?.color || '#999'}>{allCategories.find(c => c.id === tx.category)?.name}</Badge></td>
                  <td className="px-6 py-4 text-gray-800 font-medium">{tx.note}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">{formatCurrency(tx.amount)}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => deleteTransaction(tx.id)} 
                      className="text-gray-300 sm:hover:text-red-500 p-2 rounded-full sm:hover:bg-red-50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-125 active:bg-red-100 active:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
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
          <div><h3 className="text-2xl font-bold text-gray-800">Cài đặt ngân sách</h3><p className="text-gray-500">Quản lý hạn mức và hiển thị cho từng danh mục</p></div>
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
          const isVisible = categoryVisibility[cat.id] !== false; // Default true
          const isAlertOn = categoryAlerts[cat.id] !== false; // Default true
          const isCustom = cat.id.startsWith('custom_'); // Check if custom category

          return (
            <div key={cat.id} className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sm:hover:shadow-md transition-all group relative overflow-hidden ${!isVisible ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              
              {/* Controls: Visibility, Alert, Delete */}
              <div className="absolute top-4 right-4 z-20 flex gap-2">
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
                    {/* Simplified Header without Icon */}
                    <div className="w-10 h-2 rounded-full mb-3" style={{backgroundColor: cat.color}}></div>
                    <h4 className="font-bold text-lg text-gray-800">{cat.name}</h4>
                  </div>
                  <div className="relative mt-auto">
                      <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Hạn mức tháng</label>
                      <input type="number" className="w-full text-xl font-bold border-b-2 border-slate-100 focus:border-gray-800 outline-none py-2 transition-colors bg-transparent text-gray-800" value={currentVal} onChange={(e) => setBudgets({...budgets, [cat.id]: Number(e.target.value)})} placeholder="0" />
                      <span className="absolute right-0 bottom-3 text-xs text-gray-400 font-bold">VNĐ</span>
                  </div>
              </div>
            </div>
          )
        })}
        {/* ADD NEW BUTTON CARD */}
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

      {/* MODAL ADD CATEGORY */}
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
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngân sách dự kiến</label>
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

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState(INITIAL_BUDGETS);
  const [customCategoryConfig, setCustomCategoryConfig] = useState({}); 
  const [categoryVisibility, setCategoryVisibility] = useState({}); 
  const [categoryAlerts, setCategoryAlerts] = useState({}); // New State for Alerts
  const [noteStats, setNoteStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // --- FILTER STATE ---
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [chartMode, setChartMode] = useState('daily');
  const [chartCategoryFilter, setChartCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // --- AUTH ---
  useEffect(() => {
    const initAuth = async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else { throw new Error("No token provided"); }
        } catch (error) {
            console.warn("Auth with token failed, fallback anon:", error);
            try { await signInAnonymously(auth); } catch (e) { console.error(e); }
        }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    // Transactions
    const unsubTx = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(data);
      setIsLoading(false);
    }, (e) => { console.error(e); setIsLoading(false); });

    // Budgets
    const unsubBudget = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'budgets', 'config'), (s) => s.exists() && setBudgets(s.data()));
    
    // Custom Categories
    const unsubCustomCats = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories'), (s) => {
      if (s.exists()) setCustomCategoryConfig(s.data());
    });

    // Visibility Settings
    const unsubVisibility = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'visibility'), (s) => {
      if (s.exists()) setCategoryVisibility(s.data());
    });

    // Alert Settings (NEW)
    const unsubAlerts = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'alerts'), (s) => {
      if (s.exists()) setCategoryAlerts(s.data());
    });

    const unsubNotes = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'stats', 'notes'), (s) => s.exists() && setNoteStats(s.data()));

    return () => { unsubTx(); unsubBudget(); unsubNotes(); unsubCustomCats(); unsubVisibility(); unsubAlerts(); };
  }, [user]);

  // --- DYNAMIC CATEGORY MERGE ---
  const allCategories = useMemo(() => {
    const mergedConfig = { ...DEFAULT_CATEGORY_CONFIG, ...customCategoryConfig };
    return Object.keys(mergedConfig).map(key => ({
      id: key,
      name: mergedConfig[key].label,
      color: mergedConfig[key].color,
      icon: ICON_LIBRARY[mergedConfig[key].icon] || Star // Default icon fallback
    }));
  }, [customCategoryConfig]);

  // --- ACTIONS ---
  const addTransaction = async (newTx) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), { ...newTx, createdAt: serverTimestamp(), createdBy: user.uid });
    if (newTx.note?.trim()) {
      const cleanNote = newTx.note.trim().replace(/\./g, '');
      if (cleanNote) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stats', 'notes'), { [cleanNote]: increment(1) }, { merge: true });
    }
  };

  const deleteTransaction = async (id) => {
    if (!user || !confirm('Bạn có chắc muốn xóa giao dịch này?')) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id));
  };

  const saveBudgetsToDb = async (newBudgets) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'budgets', 'config'), newBudgets);
    alert("Đã cập nhật ngân sách thành công!");
  };

  const addNewCategory = async ({ name, budget }) => {
    if (!user) return;
    const id = `custom_${Date.now()}`;
    const randomColor = getRandomColor();
    // REMOVED ICON FROM SAVE
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories'), {
      [id]: { label: name, color: randomColor }
    }, { merge: true });
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'budgets', 'config'), {
      [id]: Number(budget)
    }, { merge: true });
    alert("Đã thêm danh mục mới thành công!");
  };

  const deleteCustomCategory = async (id) => {
    if (!user || !confirm('Bạn có chắc muốn xóa danh mục này? Dữ liệu chi tiêu cũ vẫn được giữ nhưng danh mục sẽ không còn hiển thị.')) return;
    
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories');
    const budgetRef = doc(db, 'artifacts', appId, 'public', 'data', 'budgets', 'config');
    const visibilityRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'visibility');
    const alertsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'alerts');

    // Remove from settings map
    await updateDoc(settingsRef, { [id]: deleteField() });
    
    // Clean up budget config (optional but good for data hygiene)
    await updateDoc(budgetRef, { [id]: deleteField() });
    
    // Clean up other configs
    try { await updateDoc(visibilityRef, { [id]: deleteField() }); } catch(e) {}
    try { await updateDoc(alertsRef, { [id]: deleteField() }); } catch(e) {}
  };

  const toggleVisibility = async (id) => {
    if (!user) return;
    const currentStatus = categoryVisibility[id] !== false; 
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'visibility'), {
      [id]: !currentStatus
    }, { merge: true });
  };

  const toggleAlert = async (id) => {
    if (!user) return;
    const currentStatus = categoryAlerts[id] !== false; // Default true
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'alerts'), {
      [id]: !currentStatus
    }, { merge: true });
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
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const spendingDiff = totalSpent - previousMonthData.total;
  const totalIncurred = currentMonthTransactions.filter(t => t.isIncurred).reduce((sum, t) => sum + Number(t.amount), 0);

  // --- FILTERED SPENDING DATA ---
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
      // Logic check: Only Alert if budget exists AND alert is enabled for this category
      if (item.budget > 0 && categoryAlerts[item.id] !== false) {
        const ratio = item.value / item.budget;
        if (ratio >= 1) results.push({ id: item.id, name: item.name, ratio, type: 'danger', message: `Đã hết ngân sách ${item.name}` });
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

  const AddTransactionModal = ({ onClose }) => {
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], amount: '', category: 'eating', note: '', isIncurred: false });
    const [suggestions, setSuggestions] = useState([]);
    
    const handleNoteChange = (e) => {
      const val = e.target.value;
      setFormData({...formData, note: val});
      if (val.length >= 3) {
        const matches = Object.entries(noteStats).filter(([n, c]) => c >= 2 && n.toLowerCase().includes(val.toLowerCase())).sort((a,b)=>b[1]-a[1]).map(([n])=>n).slice(0,5);
        setSuggestions(matches);
      } else setSuggestions([]);
    };

    const handleSubmit = (e) => { e.preventDefault(); if (!formData.amount || !formData.date) return; addTransaction(formData); onClose(); };

    return (
      <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden my-4">
          <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Thêm giao dịch</h3>
            <button 
              onClick={onClose} 
              className="bg-gray-100 sm:hover:bg-gray-200 p-2 rounded-full transition-colors active:scale-90 active:bg-gray-200"
            >
              <X size={18} className="text-gray-600"/>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Số tiền</label><div className="relative"><input type="number" required className="w-full pl-4 pr-10 py-4 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 outline-none text-2xl font-bold text-gray-800 transition-all bg-slate-50 focus:bg-white" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0" autoFocus /><span className="absolute right-4 top-5 text-gray-400 font-bold">VNĐ</span></div></div>
            <div 
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer active:scale-[0.98] active:bg-slate-50 ${formData.isIncurred ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`} 
              onClick={() => setFormData({...formData, isIncurred: !formData.isIncurred})}
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${formData.isIncurred ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`}>{formData.isIncurred && <X size={14} className="text-white" />}</div><label className="text-sm font-medium text-gray-700 cursor-pointer select-none">Đánh dấu là chi phí phát sinh</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ngày</label><input type="date" required className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-base sm:text-sm font-medium text-gray-700" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Danh mục</label><select className="custom-select w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white text-base sm:text-sm font-medium text-gray-700" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>{allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <div className="relative"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Nội dung</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-base sm:text-sm font-medium text-gray-700 placeholder:text-gray-300" value={formData.note} onChange={handleNoteChange} placeholder="Nhập ghi chú..." />{suggestions.length > 0 && (<div className="absolute z-10 w-full bg-white border border-gray-100 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto animate-fade-in py-2">{suggestions.map((s, idx) => (<div key={idx} onClick={() => { setFormData({...formData, note: s}); setSuggestions([]); }} className="px-4 py-2 sm:hover:bg-slate-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2 active:bg-gray-100"><List size={14} className="text-gray-400" />{s}</div>))}</div>)}</div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold sm:hover:bg-blue-700 shadow-lg shadow-blue-200 transform active:scale-[0.98] active:bg-blue-700 transition-all"
            >
              Lưu Giao Dịch
            </button>
          </form>
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

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans flex flex-col md:flex-row overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
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
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white px-5 py-4 flex justify-between items-center sticky top-0 z-50 border-b border-gray-100">
        <h1 className="font-bold text-lg text-gray-900 flex items-center gap-2">Tuấn Phan</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 sm:hover:bg-gray-100 active:bg-gray-200 rounded-lg text-gray-600 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
        </button>
      </div>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden animate-fade-in backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl md:shadow-none pt-[73px] md:pt-0`}>
        <div className="p-8 border-b border-slate-50 hidden md:block"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">T</div><div><h1 className="font-extrabold text-xl text-gray-900 tracking-tight leading-none">Tuấn Phan</h1><p className="text-xs text-gray-400 font-medium mt-1">Personal Finance</p></div></div></div>
        <nav className="p-6 space-y-2 flex-1">
          <SidebarItem id="dashboard" label="Tổng quan" icon={LayoutDashboard} active={activeTab === 'dashboard'} />
          <SidebarItem id="transactions" label="Sổ giao dịch" icon={Receipt} active={activeTab === 'transactions'} />
          <SidebarItem id="budget" label="Cài đặt ngân sách" icon={Settings} active={activeTab === 'budget'} />
        </nav>
        <div className="p-6"><div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 border border-slate-100"><div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Database size={14} /></div><div><p className="text-xs font-bold text-gray-700">Trạng thái</p><p className="text-[10px] text-green-600 flex items-center gap-1 font-bold uppercase tracking-wider"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online</p></div></div></div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 relative scroll-smooth">
        <header className="bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200/50">
          <div className="flex items-center gap-4 w-full sm:w-auto">{(activeTab === 'dashboard' || activeTab === 'transactions') && <FilterBar />}</div>
          <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 sm:hover:bg-black text-white px-5 py-2.5 rounded-xl shadow-lg shadow-gray-300 transition-all active:scale-95 font-bold text-sm"><PlusCircle size={18} /> <span className="sm:hidden md:inline">Thêm khoản chi</span></button>
        </header>

        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-300"><div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mb-6 opacity-20"></div><p className="font-medium animate-pulse">Đang đồng bộ dữ liệu...</p></div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardContent 
                  totalSpent={totalSpent} totalBudget={totalBudget} spendingDiff={spendingDiff} totalIncurred={totalIncurred} alerts={alerts} 
                  spendingByCategory={spendingByCategory} currentChartData={chartMode === 'daily' ? dailySpendingData : monthlySpendingData} 
                  chartMode={chartMode} setChartMode={setChartMode} 
                  chartCategoryFilter={chartCategoryFilter} setChartCategoryFilter={setChartCategoryFilter}
                  allCategories={allCategories}
                  categoryVisibility={categoryVisibility} // Passed visibility prop
                />
              )}
              {activeTab === 'transactions' && (
                <TransactionContent 
                  filtered={filteredTransactions} viewMonth={viewMonth} viewYear={viewYear} 
                  search={search} setSearch={setSearch} filterCategory={filterCategory} setFilterCategory={setFilterCategory} 
                  deleteTransaction={deleteTransaction}
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
                  categoryAlerts={categoryAlerts} // Pass alert state
                  toggleAlert={toggleAlert} // Pass alert toggle function
                  deleteCustomCategory={deleteCustomCategory} // Pass delete function
                />
              )}
            </>
          )}
        </div>
      </main>
      {showAddModal && <AddTransactionModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}