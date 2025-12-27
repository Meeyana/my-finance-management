import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList, LineChart, Line
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
  ClipboardList, ArrowLeft, Filter, HandCoins, CalendarDays, CheckCircle
} from 'lucide-react';

// FIREBASE IMPORTS
import {
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  signInWithCustomToken
} from "firebase/auth";
import {
  collection, addDoc, onSnapshot, query,
  deleteDoc, doc, setDoc, updateDoc, deleteField, serverTimestamp, increment
} from "firebase/firestore";
import { auth, db, appId, getFirestorePaths } from '../../lib/firebase';
import { formatCurrency, formatShortCurrency, getRandomColor } from '../../utils/format';
import { Card, Badge } from '../../components/common/Card';
import LoginScreen from '../auth/LoginScreen';
import { useNavigate } from 'react-router-dom';
import { useTrial } from '../../hooks/useTrial';
import TrialLimitModal from '../../components/common/TrialLimitModal';

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

// --- DASHBOARD CONTENT (UPDATED V3 - SYNC REMAINING) ---
const DashboardContent = React.memo(({
  totalSpent, monthlyIncome, updateMonthlyIncome, spendingDiff, totalIncurred, alerts,
  spendingByCategory, currentChartData, chartMode, setChartMode,
  chartCategoryFilter, setChartCategoryFilter, allCategories, categoryVisibility,
  userName, isPublic, checkPermission
}) => {
  const [showCharts, setShowCharts] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [tempIncome, setTempIncome] = useState(monthlyIncome);

  // --- STATE: Filter ---
  const [excludedCats, setExcludedCats] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

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

  // --- LOGIC TÍNH TOÁN FILTER ---
  const filteredTotalSpent = useMemo(() => {
    if (excludedCats.length === 0) return totalSpent;
    return spendingByCategory
      .filter(item => !excludedCats.includes(item.id))
      .reduce((sum, item) => sum + item.value, 0);
  }, [totalSpent, spendingByCategory, excludedCats]);

  const toggleExclude = (catId) => {
    setExcludedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleSelectAll = () => setExcludedCats([]);

  const handleDeselectAll = () => {
    const allVisibleIds = allCategories
      .filter(c => categoryVisibility[c.id] !== false)
      .map(c => c.id);
    setExcludedCats(allVisibleIds);
  };
  // ------------------------------

  // --- CẬP NHẬT LOGIC: TÍNH CÒN LẠI THEO SỐ ĐÃ LỌC ---
  // Trước đây: const remaining = monthlyIncome - totalSpent;
  const remaining = monthlyIncome - filteredTotalSpent;
  // ----------------------------------------------------

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
    <div className="space-y-6 animate-fade-in pb-12" onClick={() => setShowFilterMenu(false)}>
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

        {/* --- CARD ĐÃ CHI TIÊU --- */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200 shadow-lg border-none relative overflow-visible">
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">
                {excludedCats.length > 0 ? 'Chi tiêu (Tùy chỉnh)' : 'Đã chi tiêu'}
              </p>

              {/* Nút Filter */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`p-1.5 rounded-lg transition-colors ${showFilterMenu ? 'bg-white text-blue-600' : 'bg-white/20 text-white hover:bg-white/30'}`}
                >
                  <Filter size={16} />
                </button>

                {/* Dropdown Menu Filter */}
                {showFilterMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-scale-in">

                    <div className="flex gap-2 mb-2 pb-2 border-b border-gray-100 px-1">
                      <button
                        onClick={handleSelectAll}
                        className="flex-1 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        onClick={handleDeselectAll}
                        className="flex-1 py-1.5 text-[11px] font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>

                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 px-2">Danh mục hiển thị</p>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                      {allCategories.filter(c => categoryVisibility[c.id] !== false).map(cat => (
                        <div
                          key={cat.id}
                          onClick={() => toggleExclude(cat.id)}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-gray-700 text-sm select-none"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${excludedCats.includes(cat.id) ? 'border-gray-300 bg-white' : 'border-blue-500 bg-blue-500'}`}>
                            {!excludedCats.includes(cat.id) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <span className={`transition-opacity ${excludedCats.includes(cat.id) ? 'opacity-50' : 'font-medium'}`}>{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-3xl font-bold mt-2 tracking-tight">{formatCurrency(filteredTotalSpent)}</h3>

            <div className="mt-3 inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
              {spendingDiff > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {spendingDiff > 0 ? '+' : ''}{formatShortCurrency(spendingDiff)} so với tháng trước
            </div>
          </div>
          <TrendingDown className="absolute right-[-10px] bottom-[-10px] text-white opacity-20" size={100} />
        </Card>

        {/* SCORECARD THU NHẬP */}
        <Card className="cursor-pointer hover:shadow-md transition-all relative group"
          onClick={() => {
            if (!checkPermission()) return;
            setShowIncomeModal(true);
          }}>
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

        {/* --- SCORECARD CÒN LẠI (Sẽ tự động cập nhật theo 'remaining' mới) --- */}
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                {excludedCats.length > 0 ? 'Còn lại (Theo lọc)' : 'Còn lại'}
              </p>
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
              <button onClick={(e) => { e.stopPropagation(); setShowIncomeModal(false); }} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18} /></button>
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

      {/* ALERTS */}
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

      {/* BIỂU ĐỒ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[420px]">
          <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <PieChart size={20} className="text-gray-400" /> Phân bổ chi tiêu
          </h4>
          <div className="h-80 w-full">
            {!showCharts ? (
              <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl animate-pulse"><p className="text-gray-400 text-sm">Đang tải biểu đồ...</p></div>
            ) : (
              /* LOGIC MỚI: Tạo biến tạm chartData để check độ dài */
              (() => {
                // Lọc data: Phải > 0 VÀ không nằm trong danh sách loại trừ (filter dashboard)
                // Lưu ý: spendingByCategory đã tự động loại bỏ các mục ẩn từ "Cài đặt hạn mức" rồi
                const chartData = spendingByCategory.filter(i => i.value > 0 && !excludedCats.includes(i.id));

                // Kiểm tra nếu có data thì vẽ, không thì hiện "Chưa có dữ liệu"
                if (chartData.length > 0) {
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData} // Dùng data đã lọc
                          cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value" label={renderCustomizedLabel}
                          activeShape={null}
                        >
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />)}
                        </Pie>
                        <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                } else {
                  // Giao diện khi không có dữ liệu (hoặc đã bị ẩn hết)
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400"><Database size={48} className="mb-2 opacity-10" /><p className="text-sm">Chưa có dữ liệu</p></div>
                  );
                }
              })()
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
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={chartMode === 'daily' ? 2 : 0} />
                  <YAxis hide />
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label, payload) => payload[0]?.payload.fullLabel || label} cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
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
              <BarChart data={spendingByCategory.filter(item => item.value > 0 || item.budget > 0)} layout="vertical" margin={{ left: 40, right: 60 }} barCategoryGap={24}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#4B5563', fontWeight: 600 }} width={80} axisLine={false} tickLine={false} />
                <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
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
                  <LabelList dataKey="value" position="right" formatter={(val) => val > 0 ? formatShortCurrency(val) : ''} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#6B7280' }} />
                </Bar>
                <Bar dataKey="budget" name="Định mức" fill="#F3F4F6" barSize={20} radius={[0, 6, 6, 0]} isAnimationActive={false} activeBar={false}>
                  <LabelList dataKey="budget" position="right" formatter={(val) => val > 0 ? formatShortCurrency(val) : ''} style={{ fontSize: '11px', fill: '#9CA3AF' }} />
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
  filtered, viewMonth, viewYear, search, setSearch, filterCategory, setFilterCategory, deleteTransaction, onEdit, allCategories, checkPermission
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
                    {tx.isRecurring && <span className="ml-2 text-blue-500" title="Tự động"><Repeat size={12} className="inline" /></span>}
                  </td>
                  <td className="px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap"><Badge color={allCategories.find(c => c.id === tx.category)?.color || '#999'}>{allCategories.find(c => c.id === tx.category)?.name}</Badge></td>
                  <td className="px-2 py-3 sm:px-6 sm:py-4 text-gray-800 font-medium break-words max-w-[200px]">{tx.note}</td>
                  <td className="px-2 py-3 sm:px-6 sm:py-4 text-right font-bold text-gray-800 whitespace-nowrap">{formatCurrency(tx.amount)}</td>
                  <td className="px-2 py-3 sm:px-6 sm:py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          if (!checkPermission()) return;
                          onEdit(tx);
                        }}
                        className="text-gray-300 sm:hover:text-blue-500 p-2 rounded-full sm:hover:bg-blue-50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-125 active:bg-blue-100 active:text-blue-600"
                        title="Chỉnh sửa"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (!checkPermission()) return;
                          deleteTransaction(tx.id);
                        }}
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
  categoryAlerts, toggleAlert, deleteCustomCategory, updateCategoryName, checkPermission
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', budget: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCat.name || !newCat.budget) return;
    await onAddCategory(newCat);
    setShowAddModal(false);
    setNewCat({ name: '', budget: '' });
  };

  const handleEditClick = (cat) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setShowEditModal(true);
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editingCategory) return;
    await updateCategoryName(editingCategory.id, editName.trim());
    setShowEditModal(false);
    setEditingCategory(null);
    setEditName('');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2">
        <div><h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Settings size={24} className="text-gray-400" /> Cài đặt hạn mức chi tiêu</h3>
          <p className="text-gray-500">Đặt giới hạn cho từng danh mục để nhận cảnh báo khi vượt quá</p></div>
        <button
          onClick={() => {
            if (!checkPermission()) return;
            saveBudgetsToDb(budgets);
          }}
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

              <div className="absolute top-3 right-3 z-20 flex gap-1.5">

                {/* Nút Edit */}
                <button
                  onClick={() => {
                    if (!checkPermission()) return; // <--- BỌC LẠI
                    handleEditClick(cat);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full shadow-sm transition-all bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 active:scale-90"
                  title="Chỉnh sửa tên"
                >
                  <Edit size={16} strokeWidth={2.5} /> {/* Tăng độ dày icon cho dễ nhìn */}
                </button>

                {/* Nút Xóa (cho Custom Category) */}
                {isCustom && (
                  <button
                    onClick={() => {
                      if (!checkPermission()) return; // <--- BỌC LẠI
                      deleteCustomCategory(cat.id);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-full shadow-sm transition-all bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 active:scale-90"
                    title="Xóa danh mục"
                  >
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                )}

                {/* Nút Alert */}
                <button
                  onClick={() => {
                    if (!checkPermission()) return; // <--- BỌC LẠI
                    toggleAlert(cat.id);
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-full shadow-sm transition-all active:scale-90 ${isAlertOn ? 'bg-white text-yellow-500 hover:bg-yellow-50 border border-yellow-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  title={isAlertOn ? "Đang bật cảnh báo" : "Đã tắt cảnh báo"}
                >
                  {isAlertOn ? <Bell size={16} strokeWidth={2.5} /> : <BellOff size={16} />}
                </button>

                {/* Nút Visibility */}
                <button
                  onClick={() => {
                    if (!checkPermission()) return; // <--- BỌC LẠI
                    toggleVisibility(cat.id);
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-full shadow-sm transition-all active:scale-90 ${isVisible ? 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  title={isVisible ? "Đang hiển thị" : "Đã ẩn"}
                >
                  {isVisible ? <Eye size={16} strokeWidth={2.5} /> : <EyeOff size={16} />}
                </button>
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between mt-2">
                <div className="mb-4">
                  <div className="w-10 h-2 rounded-full mb-3" style={{ backgroundColor: cat.color }}></div>
                  <h4 className="font-bold text-lg text-gray-800">{cat.name}</h4>
                </div>
                <div className="relative mt-auto">
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Hạn mức tháng</label>
                  <input type="number" className="w-full text-xl font-bold border-b-2 border-slate-100 focus:border-gray-800 outline-none py-2 transition-colors bg-transparent text-gray-800" value={currentVal === 0 ? '' : currentVal} onChange={(e) => setBudgets({ ...budgets, [cat.id]: Number(e.target.value) })} placeholder="0" />
                  <span className="absolute right-0 bottom-3 text-xs text-gray-400 font-bold">đ</span>
                </div>
              </div>
            </div>
          )
        })}

        <button
          onClick={() => {
            if (!checkPermission()) return;
            setShowAddModal(true)
          }
          }
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
              <button onClick={() => setShowAddModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên danh mục</label>
                <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="Ví dụ: Du lịch, Thú cưng..." value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hạn mức dự kiến</label>
                <input required type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="0" value={newCat.budget} onChange={e => setNewCat({ ...newCat, budget: e.target.value })} />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">Tạo danh mục</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingCategory && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Chỉnh sửa tên danh mục</h3>
              <button onClick={() => { setShowEditModal(false); setEditingCategory(null); setEditName(''); }} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateName} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên danh mục</label>
                <input
                  required
                  type="text"
                  autoFocus
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  placeholder="Nhập tên mới..."
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingCategory(null); setEditName(''); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">
                  Lưu thay đổi
                </button>
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
  recurringItems, addRecurringItem, updateRecurringItem, deleteRecurringItem, allCategories, checkPermission
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
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Repeat size={24} className="text-gray-500" />Chi tiêu cố định</h3>
          <p className="text-gray-500">Tự động tạo giao dịch cho các khoản chi hàng tháng</p>
        </div>
        <button
          onClick={() => { if (!checkPermission()) return; resetForm(); setShowModal(true); }}
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
                      onClick={() => {
                        if (!checkPermission()) return; // <--- BỌC LẠI
                        handleEdit(item);
                      }}
                      className="text-gray-300 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (!checkPermission()) return; // <--- BỌC LẠI
                        deleteRecurringItem(item.id);
                      }}
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
            <button onClick={() => { if (!checkPermission()) return; resetForm(); setShowModal(true); }} className="text-blue-600 font-bold hover:underline mt-2">Tạo ngay</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-800">{editingItem ? 'Chỉnh sửa khoản chi' : 'Thêm khoản chi cố định'}</h3>
              <button onClick={() => setShowModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên khoản chi</label>
                <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="Ví dụ: Tiền nhà, Internet..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số tiền hàng tháng</label>
                <input required type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder="0" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Danh mục</label>
                  <select className="custom-select w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày lên sổ</label>
                  <select className="custom-select w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white" value={formData.day} onChange={e => setFormData({ ...formData, day: e.target.value })}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
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
                    onClick={() => setFormData({ ...formData, isLifetime: true })}
                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.isLifetime ? 'bg-white border-blue-500 text-blue-600 shadow-sm ring-1 ring-blue-500' : 'bg-transparent border-slate-200 text-gray-500 hover:bg-white hover:border-slate-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.isLifetime ? 'border-blue-500' : 'border-gray-400'}`}>
                      {formData.isLifetime && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                    </div>
                    Trọn đời
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isLifetime: false })}
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
                        onChange={e => setFormData({ ...formData, durationMonths: e.target.value })}
                      />
                    </div>
                    <div className="w-1/3">
                      <select
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-sm font-bold text-gray-700 h-full"
                        value={formData.durationType}
                        onChange={e => setFormData({ ...formData, durationType: e.target.value })}
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
  const [startMonth, setStartMonth] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [endYear, setEndYear] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // Get min and max month/year from data
  const monthRange = useMemo(() => {
    if (transactions.length === 0 && Object.keys(allMonthlyIncome).length === 0) {
      return { minMonth: null, minYear: null, maxMonth: null, maxYear: null };
    }

    let minMonth = null;
    let minYear = null;
    let maxMonth = null;
    let maxYear = null;

    // Check transactions
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const year = d.getFullYear();
      const month = d.getMonth();

      if (minYear === null || year < minYear || (year === minYear && month < minMonth)) {
        minYear = year;
        minMonth = month;
      }
      if (maxYear === null || year > maxYear || (year === maxYear && month > maxMonth)) {
        maxYear = year;
        maxMonth = month;
      }
    });

    // Check income data
    Object.keys(allMonthlyIncome).forEach(key => {
      const [year, month] = key.split('-');
      const y = parseInt(year);
      const m = parseInt(month);

      if (minYear === null || y < minYear || (y === minYear && m < minMonth)) {
        minYear = y;
        minMonth = m;
      }
      if (maxYear === null || y > maxYear || (y === maxYear && m > maxMonth)) {
        maxYear = y;
        maxMonth = m;
      }
    });

    return { minMonth, minYear, maxMonth, maxYear };
  }, [transactions, allMonthlyIncome]);

  const stats = useMemo(() => {
    const monthlyData = {};

    // Filter transactions by month/year range if set
    const filteredTransactions = transactions.filter(tx => {
      if (!startMonth && !startYear && !endMonth && !endYear) return true;
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();

      if (startYear && startMonth !== '') {
        const startM = parseInt(startMonth);
        const startY = parseInt(startYear);
        if (txYear < startY || (txYear === startY && txMonth < startM)) return false;
      }
      if (endYear && endMonth !== '') {
        const endM = parseInt(endMonth);
        const endY = parseInt(endYear);
        if (txYear > endY || (txYear === endY && txMonth > endM)) return false;
      }
      return true;
    });

    filteredTransactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyData[key]) monthlyData[key] = { spent: 0, income: 0, month: d.getMonth(), year: d.getFullYear() };
      monthlyData[key].spent += Number(tx.amount);
    });

    // Filter income data by month/year range if set
    Object.keys(allMonthlyIncome).forEach(key => {
      const [year, month] = key.split('-');
      const y = parseInt(year);
      const m = parseInt(month);

      if (startYear && startMonth !== '') {
        const startM = parseInt(startMonth);
        const startY = parseInt(startYear);
        if (y < startY || (y === startY && m < startM)) return;
      }
      if (endYear && endMonth !== '') {
        const endM = parseInt(endMonth);
        const endY = parseInt(endYear);
        if (y > endY || (y === endY && m > endM)) return;
      }

      if (!monthlyData[key]) {
        monthlyData[key] = { spent: 0, income: 0, month: m, year: y };
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
  }, [transactions, allMonthlyIncome, startMonth, startYear, endMonth, endYear]);

  const trendData = useMemo(() => {
    return [...stats.list]
      .sort((a, b) => (a.year - b.year) || (a.month - b.month))
      .map(item => ({
        name: `T${item.month + 1}/${item.year}`,
        income: item.income,
        spent: item.spent,
        balance: item.balance
      }));
  }, [stats.list]);

  const handleResetFilter = () => {
    setStartMonth('');
    setStartYear('');
    setEndMonth('');
    setEndYear('');
    setShowFilter(false);
  };

  const getFilterDescription = () => {
    if (!startMonth && !startYear && !endMonth && !endYear) {
      return 'Tính trên tất cả các tháng đã ghi nhận';
    }
    if (startMonth && startYear && endMonth && endYear) {
      return `Từ tháng ${parseInt(startMonth) + 1}/${startYear} đến tháng ${parseInt(endMonth) + 1}/${endYear}`;
    }
    if (startMonth && startYear) {
      return `Từ tháng ${parseInt(startMonth) + 1}/${startYear}`;
    }
    if (endMonth && endYear) {
      return `Đến tháng ${parseInt(endMonth) + 1}/${endYear}`;
    }
    return 'Tính trên tất cả các tháng đã ghi nhận';
  };

  // Generate year options
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    if (monthRange.minYear && monthRange.maxYear) {
      for (let y = monthRange.minYear; y <= monthRange.maxYear; y++) {
        years.push(y);
      }
    } else {
      for (let y = currentYear - 5; y <= currentYear + 2; y++) {
        years.push(y);
      }
    }
    return years;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList size={20} className="text-gray-400" />
          Dư nợ & Tích lũy
        </h3>
        <p className="text-sm text-gray-500">
          Xem tổng dư/nợ, xu hướng thu-chi và bảng kê chi tiết theo tháng. Bạn có thể lọc theo khoảng tháng/năm để phân tích giai đoạn cụ thể.
        </p>
      </div>

      <Card className={`${stats.totalBalance >= 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white border-none shadow-lg`}>
        <div className="flex flex-col items-center justify-center py-6">
          <h3 className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-2">Tổng tích lũy (Dư/Nợ)</h3>
          <div className="text-4xl font-bold flex items-center gap-2">
            {stats.totalBalance >= 0 ? <TrendingUp size={36} /> : <TrendingDown size={36} />}
            {formatCurrency(stats.totalBalance)}
          </div>
          <p className="mt-2 opacity-80 text-sm">{getFilterDescription()}</p>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-gray-400" />
            <h4 className="font-bold text-gray-800">Xu hướng thu / chi</h4>
          </div>
          <span className="text-xs text-gray-500 font-semibold">{trendData.length} tháng</span>
        </div>
        <div className="h-72">
          {trendData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Database size={40} className="mb-2 opacity-20" />
              <p className="text-sm">Chưa có dữ liệu</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <YAxis hide />
                <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Thu nhập" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="spent" name="Chi tiêu" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden border-0 shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><ClipboardList size={20} /></div>
            <h3 className="font-bold text-gray-800">Bảng kê chi tiết theo tháng</h3>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Calendar size={16} />
              {(startMonth || startYear || endMonth || endYear) ? 'Đang lọc' : 'Lọc theo tháng/năm'}
              {(startMonth || startYear || endMonth || endYear) && (
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
              )}
            </button>
            {(startMonth || startYear || endMonth || endYear) && (
              <button
                onClick={handleResetFilter}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {showFilter && (
          <div className="p-4 bg-blue-50/50 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Từ tháng/năm</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="custom-select w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-sm font-medium text-gray-700"
                  >
                    <option value="">Chọn tháng</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>Tháng {i + 1}</option>
                    ))}
                  </select>
                  <select
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    className="custom-select w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-sm font-medium text-gray-700"
                  >
                    <option value="">Chọn năm</option>
                    {getYearOptions().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Đến tháng/năm</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="custom-select w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-sm font-medium text-gray-700"
                  >
                    <option value="">Chọn tháng</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>Tháng {i + 1}</option>
                    ))}
                  </select>
                  <select
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    className="custom-select w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white text-sm font-medium text-gray-700"
                  >
                    <option value="">Chọn năm</option>
                    {getYearOptions().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {(startMonth || startYear || endMonth || endYear) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <span>Hiển thị:</span>
                <span className="font-bold">{stats.list.length} tháng</span>
                <span>•</span>
                <span>Tổng: {formatCurrency(stats.totalBalance)}</span>
              </div>
            )}
          </div>
        )}
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

// --- COMPONENT: LOAN CONTENT (NEW FEATURE) ---
// --- COMPONENT: LOAN CONTENT (UPDATED UI & ALERTS) ---  
const LoanContent = ({
  loans, addLoan, updateLoan, deleteLoan, formatCurrency, checkPermission
}) => {
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, lent, borrowed
  const [editingLoan, setEditingLoan] = useState(null);
  const [formData, setFormData] = useState({
    type: 'lent', // lent (cho vay), borrowed (đi vay)
    person: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    note: '',
    status: 'pending' // pending, completed
  });

  const resetForm = () => {
    setFormData({
      type: 'lent', person: '', amount: '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '', note: '', status: 'pending'
    });
    setEditingLoan(null);
  };

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setFormData({
      type: loan.type, person: loan.person, amount: loan.amount,
      startDate: loan.startDate, dueDate: loan.dueDate || '',
      note: loan.note || '', status: loan.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.person || !formData.amount) return;

    const payload = { ...formData, amount: Number(formData.amount) };

    if (editingLoan) {
      await updateLoan(editingLoan.id, payload);
    } else {
      await addLoan(payload);
    }
    setShowModal(false);
    resetForm();
  };

  // --- LOGIC TÍNH TOÁN & CẢNH BÁO ---
  const { stats, sortedLoans, alerts } = useMemo(() => {
    const pendingLoans = loans.filter(l => l.status === 'pending');
    const totalLent = pendingLoans.filter(l => l.type === 'lent').reduce((sum, l) => sum + l.amount, 0);
    const totalBorrowed = pendingLoans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + l.amount, 0);

    // Xử lý danh sách hiển thị
    const filtered = loans.filter(l => {
      if (filterType === 'all') return true;
      return l.type === filterType;
    }).sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return new Date(b.startDate) - new Date(a.startDate);
    });

    // Xử lý cảnh báo (Alerts)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const generatedAlerts = [];

    pendingLoans.forEach(loan => {
      if (!loan.dueDate) return;
      const due = new Date(loan.dueDate);
      due.setHours(0, 0, 0, 0);

      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Số ngày còn lại

      // Logic màu sắc: <= 3 ngày hoặc quá hạn là ĐỎ, <= 7 ngày là VÀNG
      if (diffDays <= 3) {
        generatedAlerts.push({
          id: loan.id,
          type: 'danger', // Đỏ
          loanType: loan.type,
          person: loan.person,
          days: diffDays,
          amount: loan.amount
        });
      } else if (diffDays <= 7) {
        generatedAlerts.push({
          id: loan.id,
          type: 'warning', // Vàng
          loanType: loan.type,
          person: loan.person,
          days: diffDays,
          amount: loan.amount
        });
      }
    });

    return {
      stats: { totalLent, totalBorrowed },
      sortedLoans: filtered,
      alerts: generatedAlerts
    };
  }, [loans, filterType]);

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date().setHours(0, 0, 0, 0);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <HandCoins size={24} className="text-gray-400" />Sổ Nợ & Cho Vay
          </h3>
          <p className="text-gray-500">Quản lý các khoản vay mượn và nhắc hạn trả nợ</p>
        </div>
        <button
          onClick={() => { if (!checkPermission()) return; resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl sm:hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 w-full md:w-auto justify-center"
        >
          <PlusCircle size={18} /> Thêm khoản mới
        </button>
      </div>

      {/* --- PHẦN THÔNG BÁO (ALERTS) MỚI --- */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
          {alerts.map((alert) => {
            const isDanger = alert.type === 'danger';
            const actionText = alert.loanType === 'lent' ? 'thu hồi từ' : 'trả cho';
            let timeText = '';

            if (alert.days < 0) timeText = `Đã quá hạn ${Math.abs(alert.days)} ngày`;
            else if (alert.days === 0) timeText = `Hạn chót là hôm nay`;
            else timeText = `Còn ${alert.days} ngày nữa đến hạn`;

            return (
              <div key={alert.id} className={`p-4 rounded-xl border-l-4 shadow-sm flex items-start gap-3 ${isDanger ? 'bg-red-50 border-red-500 text-red-800' : 'bg-yellow-50 border-yellow-500 text-yellow-800'}`}>
                {isDanger ? <AlertCircle size={20} className="shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {isDanger ? 'Cảnh báo hạn nợ!' : 'Sắp đến hạn'}
                  </p>
                  <p className="text-xs mt-1">
                    Bạn cần {actionText} <strong>{alert.person}</strong> số tiền <strong>{formatCurrency(alert.amount)}</strong>.
                  </p>
                  <p className={`text-xs font-bold mt-1 ${isDanger ? 'text-red-600' : 'text-yellow-700'}`}>
                    {timeText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wider">Bạn đang cho vay</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(stats.totalLent)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg"><ArrowUpRight size={24} /></div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-100 text-sm font-medium uppercase tracking-wider">Bạn đang nợ</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(stats.totalBorrowed)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg"><ArrowDownRight size={24} /></div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-100 w-fit">
        {['all', 'lent', 'borrowed'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === type ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-slate-50'}`}
          >
            {type === 'all' ? 'Tất cả' : type === 'lent' ? 'Cho vay' : 'Đi vay'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedLoans.map(item => {
          const overdue = item.status === 'pending' && isOverdue(item.dueDate);
          return (
            <div key={item.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all relative group overflow-hidden ${item.status === 'completed' ? 'border-slate-100 opacity-60 grayscale-[0.5]' : overdue ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-100 hover:border-indigo-100 hover:shadow-md'}`}>
              {item.status === 'completed' && <div className="absolute inset-0 bg-slate-50/10 z-10 pointer-events-none flex items-center justify-center"><div className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-sm transform -rotate-12 border border-green-200 shadow-sm">Đã hoàn thành</div></div>}

              <div className="flex justify-between items-start mb-3 relative z-20">
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${item.type === 'lent' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                  {item.type === 'lent' ? 'Cho vay' : 'Đi vay'}
                </div>
                <div className="flex gap-1">
                  {item.status === 'pending' && (
                    <button onClick={() => {
                      if (!checkPermission()) return; // <--- BỌC LẠI
                      updateLoan(item.id, { status: 'completed' });
                    }}
                      className="p-2 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Đánh dấu đã xong"><CheckCircle2 size={18} /></button>
                  )}
                  <button onClick={() => {
                    if (!checkPermission()) return; // <--- BỌC LẠI
                    handleEdit(item);
                  }} className="p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit size={18} /></button>
                  <button onClick={() => {
                    if (!checkPermission()) return; // <--- BỌC LẠI
                    deleteLoan(item.id);
                  }} className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>

              <div className="mb-4 relative z-20">
                <h4 className="text-lg font-bold text-gray-800">{item.person}</h4>
                <p className={`text-2xl font-bold mt-1 ${item.type === 'lent' ? 'text-green-600' : 'text-orange-600'}`}>{formatCurrency(item.amount)}</p>
                {item.note && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.note}</p>}
              </div>

              <div className="pt-3 border-t border-slate-50 flex flex-col gap-2 relative z-20">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <Calendar size={14} className="text-gray-400" /> Ngày tạo: {new Date(item.startDate).toLocaleDateString('vi-VN')}
                </div>
                {item.dueDate && (
                  <div className={`flex items-center gap-2 text-xs font-bold ${overdue ? 'text-red-600' : 'text-indigo-600'}`}>
                    <CalendarClock size={14} /> Hạn trả: {new Date(item.dueDate).toLocaleDateString('vi-VN')}
                    {overdue && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px]">Quá hạn</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {sortedLoans.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <HandCoins size={48} className="mb-4 opacity-20" />
            <p>Chưa có khoản vay/mượn nào.</p>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">{editingLoan ? 'Cập nhật khoản vay' : 'Thêm khoản vay/mượn mới'}</h3>
              <button onClick={() => setShowModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button type="button" onClick={() => setFormData({ ...formData, type: 'lent' })} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'lent' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Cho vay (Phải thu)</button>
                <button type="button" onClick={() => setFormData({ ...formData, type: 'borrowed' })} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'borrowed' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Đi vay (Phải trả)</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{formData.type === 'lent' ? 'Người vay' : 'Chủ nợ'}</label>
                  <input required autoFocus type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium" placeholder="Nhập tên..." value={formData.person} onChange={e => setFormData({ ...formData, person: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số tiền</label>
                  <input required type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-lg font-bold" placeholder="0" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày bắt đầu</label>
                  <input required type="date" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hạn trả (Tuỳ chọn)</label>
                  <input type="date" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ghi chú</label>
                  <textarea className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm" rows="2" placeholder="Nội dung chi tiết..." value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })}></textarea>
                </div>
              </div>

              {/* --- UI TRẠNG THÁI MỚI: RÕ RÀNG HƠN --- */}
              {editingLoan && (
                <div
                  onClick={() => setFormData({ ...formData, status: formData.status === 'completed' ? 'pending' : 'completed' })}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-3 select-none ${formData.status === 'completed' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-slate-50 border-slate-200 text-gray-500 hover:bg-slate-100'}`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${formData.status === 'completed' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-400 bg-white'}`}>
                    {formData.status === 'completed' && <CheckCircle2 size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{formData.status === 'completed' ? 'Đã thanh toán xong' : 'Đánh dấu đã xong'}</p>
                    <p className="text-xs opacity-80">{formData.status === 'completed' ? 'Khoản này đã được quyết toán' : 'Khoản này vẫn đang hiệu lực'}</p>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 mt-2">
                {editingLoan ? 'Cập nhật' : 'Lưu khoản nợ'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP ---
export default function FinanceApp({ user }) {
  const navigate = useNavigate();
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
  const [loans, setLoans] = useState([]);
  //const [isAuthChecking, setIsAuthChecking] = useState(true);

  // 1. GỌI HOOK TRIAL
  const { isReadOnly, daysLeft } = useTrial(user);

  // 2. STATE ĐIỀU KHIỂN MODAL
  const [showTrialModal, setShowTrialModal] = useState(false);

  // 3. HÀM CHECK QUYỀN (Dùng để bọc các hành động)
  // Hàm này trả về TRUE nếu được phép, FALSE nếu bị chặn
  const checkPermission = () => {
    if (isReadOnly) {
      setShowTrialModal(true); // Hiện popup đẹp thay vì alert
      return false;
    }
    return true;
  };

  // Hàm xử lý khi bấm nút Nâng cấp trong Modal
  const handleUpgrade = () => {
    navigate('/pricing');
    setShowTrialModal(false);
  };

  // --- FILTER STATE ---
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [chartMode, setChartMode] = useState('daily');
  const [chartCategoryFilter, setChartCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [notification, setNotification] = useState(null);
  const notificationTimeoutRef = React.useRef(null);
  const hasInitialLoadRef = React.useRef(false);
  const dataLoadedRef = React.useRef(false);
  const loadedUserIdRef = React.useRef(null);

  const showSuccess = (msg) => {
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    setNotification(msg);
    notificationTimeoutRef.current = setTimeout(() => setNotification(null), 3000);
  };

  // --- DEBUG RENDER (Thêm dòng này ngay dưới khai báo state để check) ---
  console.log(`>>> [RENDER] isLoading: ${isLoading} | Transactions: ${transactions.length} | Budgets: ${Object.keys(budgets).length}`);

  // --- LOGIC FETCH DATA (FIXED: Budgets Collection) ---
  useEffect(() => {
    // 1. Kiểm tra User
    if (!user) return;
    console.log(">>> [FinanceApp] Effect started for User:", user.uid);
    setIsLoading(true);

    const paths = getFirestorePaths(user);
    if (!paths) { setIsLoading(false); return; }

    try {
      const parentPath = paths.transactions.parent;
      if (parentPath) {
        const loansRef = collection(parentPath, 'loans');
        onSnapshot(loansRef, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLoans(data);
        });
      }
    } catch (err) {
      console.warn("Error fetching loans:", err);
    }

    // --- SAFETY TIMEOUT (Phòng hờ treo mạng) ---
    const safetyTimer = setTimeout(() => {
      console.warn(">>> [Timeout] Force loading off");
      setIsLoading(false);
    }, 3000);

    // --- 2. LISTENER TRANSACTIONS (Giao dịch) ---
    const unsubTx = onSnapshot(query(paths.transactions), (snapshot) => {
      try {
        console.log(`>>> [Data] Received ${snapshot.docs.length} transactions`);
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return { id: doc.id, ...d, date: d.date || new Date().toISOString() };
        });

        // Sort giảm dần theo ngày
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(data);

        // QUAN TRỌNG: Tắt loading ngay khi có giao dịch
        setIsLoading(false);
        clearTimeout(safetyTimer);
      } catch (e) {
        console.error("Tx Error:", e);
        setIsLoading(false);
      }
    });

    // --- 3. LISTENER BUDGETS (FIX: Xử lý dạng Collection) ---
    // Vì 'budgets' là collection, ta phải truy cập vào sub-collection của đường dẫn gốc
    // Nếu paths.budgetConfig trong firebase.js đang trỏ sai, ta tự dựng lại path thủ công cho chắc ăn:

    let budgetQuery = paths.budgetConfig; // Mặc định dùng cái cũ

    // Nếu user nói budgets là collection, ta thử query dạng collection:
    // Cách fix nhanh: Lấy parent path của transactions (là folder user) -> trỏ vào 'budgets'
    try {
      // Hack: Dựng lại path collection budgets từ path transactions
      // transactions path: .../public/data/transactions
      // budgets path mong muốn: .../public/data/budgets
      const parentPath = paths.transactions.parent; // .../public/data
      if (parentPath) {
        const budgetsColRef = collection(parentPath, 'budgets');

        onSnapshot(budgetsColRef, (snapshot) => {
          const newBudgets = { ...INITIAL_BUDGETS };
          // Giả sử mỗi doc có id là tên category (vd: 'eating') và data có field 'amount' hoặc là số trực tiếp
          snapshot.forEach(doc => {
            const d = doc.data();
            // Logic map: Nếu doc có field 'value' hoặc 'budget', hoặc lấy chính data làm value
            const val = d.value || d.budget || d.amount || 0;
            newBudgets[doc.id] = Number(val);
          });
          console.log(">>> [Data] Budgets loaded:", newBudgets);
          setBudgets(newBudgets);
        });
      }
    } catch (err) {
      console.warn(">>> [Budgets] Error fetching collection, fallback to default", err);
    }

    // --- 4. CÁC LISTENER KHÁC (Giữ nguyên, thêm try-catch) ---
    const unsubCustomCats = onSnapshot(paths.categories, (s) => s.exists() && setCustomCategoryConfig(s.data()));
    const unsubVisibility = onSnapshot(paths.visibility, (s) => s.exists() && setCategoryVisibility(s.data()));
    const unsubAlerts = onSnapshot(paths.alerts, (s) => s.exists() && setCategoryAlerts(s.data()));

    // Cleanup
    return () => {
      clearTimeout(safetyTimer);
      unsubTx(); unsubCustomCats(); unsubVisibility(); unsubAlerts();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setBudgets(INITIAL_BUDGETS);
      setRecurringItems([]);
      setMonthlyIncome(0);
      hasInitialLoadRef.current = false;
      dataLoadedRef.current = false;
      loadedUserIdRef.current = null;
      return;
    }

    const paths = getFirestorePaths(user);
    if (!paths) return;

    // Check if this is a different user - if so, reset loading state
    const currentUserId = user.uid || (user.isAnonymous ? 'anonymous' : null);
    const isDifferentUser = loadedUserIdRef.current !== currentUserId;

    if (isDifferentUser) {
      hasInitialLoadRef.current = false;
      dataLoadedRef.current = false;
      loadedUserIdRef.current = currentUserId;
    }

    // Only show loading on very first load for this user
    // onSnapshot uses cache-first by default, so subsequent visits won't show loading
    const isFirstLoad = !hasInitialLoadRef.current;
    if (isFirstLoad) {
      setIsLoading(true);
      hasInitialLoadRef.current = true;
    }

    // Helper function to process transactions
    const processTransactions = (snapshot) => {
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
      if (isFirstLoad && !dataLoadedRef.current) {
        setIsLoading(false);
        dataLoadedRef.current = true;
      }
    };

    // Set up real-time listeners (these use cache-first by default)
    // This means if data exists in cache, it will be used immediately without API call
    const unsubTx = onSnapshot(
      query(paths.transactions),
      processTransactions,
      (e) => {
        console.error(e);
        if (isFirstLoad) {
          setIsLoading(false);
          dataLoadedRef.current = true;
        }
      }
    );

    const unsubBudget = onSnapshot(paths.budgetConfig, (s) => {
      if (s.exists()) setBudgets(s.data());
    });

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

  const addLoan = async (loanData) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    // Tự dựng path loans tương tự bước listener
    const loansRef = collection(paths.transactions.parent, 'loans');
    await addDoc(loansRef, { ...loanData, createdAt: serverTimestamp() });
    showSuccess("Đã thêm khoản nợ mới!");
  };

  const updateLoan = async (id, updatedData) => {
    if (!user) return;
    const paths = getFirestorePaths(user);
    const loansRef = collection(paths.transactions.parent, 'loans');
    await updateDoc(doc(loansRef, id), updatedData);
    showSuccess("Đã cập nhật!");
  };

  const deleteLoan = async (id) => {
    if (!user || !confirm('Xóa khoản này?')) return;
    const paths = getFirestorePaths(user);
    const loansRef = collection(paths.transactions.parent, 'loans');
    await deleteDoc(doc(loansRef, id));
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
    try { await updateDoc(paths.visibility, { [id]: deleteField() }); } catch (e) { }
    try { await updateDoc(paths.alerts, { [id]: deleteField() }); } catch (e) { }
  };

  const updateCategoryName = async (id, newName) => {
    if (!user || !newName.trim()) return;
    const paths = getFirestorePaths(user);

    // Check if it's a default category
    const defaultCategory = DEFAULT_CATEGORY_CONFIG[id];
    if (defaultCategory) {
      // For default categories, save the modified label while preserving icon and color
      await setDoc(paths.categories, {
        [id]: { ...defaultCategory, label: newName.trim() }
      }, { merge: true });
    } else {
      // For custom categories, use existing logic
      const currentCategory = customCategoryConfig[id];
      if (!currentCategory) return;

      await setDoc(paths.categories, {
        [id]: { ...currentCategory, label: newName.trim() }
      }, { merge: true });
    }

    showSuccess("Đã cập nhật tên danh mục thành công!");
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
        setFormData({ ...formData, note: val });
      } else {
        const newItems = [...advancedItems];
        newItems[index].note = val;
        setAdvancedItems(newItems);
        setActiveRowIndex(index);
      }

      if (val.length >= 3) {
        const matches = Object.entries(noteStats).filter(([n, c]) => c >= 2 && n.toLowerCase().includes(val.toLowerCase())).sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 5);
        setSuggestions(matches);
      } else setSuggestions([]);
    };

    const handleSelectSuggestion = (val, index = null) => {
      if (mode === 'simple') {
        setFormData({ ...formData, note: val });
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
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-6">
            {mode === 'simple' ? (
              <form onSubmit={handleSubmitSimple} className="space-y-5">
                {/* Row 1: Amount + Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Số tiền</label>
                    <input type="number" required className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 outline-none text-xl font-bold text-gray-800 transition-all bg-slate-50 focus:bg-white" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0" autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Danh mục</label>
                    <select className="custom-select w-full p-3 border-2 border-slate-100 rounded-xl focus:ring-0 focus:border-blue-500 outline-none bg-white text-base font-medium text-gray-700 h-[56px]" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 2: Date + Incurred */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ngày</label>
                    <input type="date" required className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-medium text-gray-700" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                  <div className="flex items-end">
                    <div
                      className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer active:scale-[0.98] ${formData.isIncurred ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-gray-600'}`}
                      onClick={() => setFormData({ ...formData, isIncurred: !formData.isIncurred })}
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
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden animate-fade-in backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- CẬP NHẬT SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl md:shadow-none pt-0`}>

        {/* User Info (Đã xóa nút Back ở đây) */}
        <div className="p-8 border-b border-slate-50 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-blue-200 shadow-lg">
              {userInitial}
            </div>
            <div><h1 className="font-extrabold text-xl text-gray-900 tracking-tight leading-none">{userName}</h1><p className="text-xs text-gray-400 font-medium mt-1">{user.isAnonymous ? 'Public Shared Dashboard' : 'Personal Finance'}</p></div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="p-6 space-y-2 flex-1 overflow-y-auto">
          <SidebarItem id="dashboard" label="Tổng quan" icon={LayoutDashboard} active={activeTab === 'dashboard'} />
          <SidebarItem id="transactions" label="Sổ giao dịch" icon={Receipt} active={activeTab === 'transactions'} />
          <SidebarItem id="recurring" label="Chi tiêu cố định" icon={Repeat} active={activeTab === 'recurring'} />
          <SidebarItem id="budget" label="Cài đặt hạn mức" icon={Settings} active={activeTab === 'budget'} />
          <div className="pt-4 border-t border-slate-50 mt-4">
            <SidebarItem id="debt" label="Dư nợ" icon={ClipboardList} active={activeTab === 'debt'} />
            <SidebarItem id="loans" label="Sổ nợ" icon={HandCoins} active={activeTab === 'loans'} />
          </div>
        </nav>

        {/* --- BOTTOM ACTIONS (CẬP NHẬT MỚI) --- */}
        <div className="p-6 space-y-2 flex-none border-t border-slate-50">
          {/* Nút Quay lại Menu */}
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white hover:bg-slate-50 text-slate-600 p-4 rounded-2xl flex items-center gap-3 transition-colors font-medium border border-slate-100 active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><ArrowLeft size={16} /></div>
            Quay lại Menu
          </button>

          {/* Nút Đăng xuất */}
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

        {/* --- BANNER DÙNG THỬ --- */}
        {isReadOnly ? (
          <div className="bg-red-600 text-white px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-md z-50 sticky top-0">
            <Lock size={16} />
            HẾT HẠN DÙNG THỬ: Bạn đang ở chế độ CHỈ XEM. Dữ liệu vẫn an toàn.
          </div>
        ) : (
          daysLeft !== null && daysLeft <= 3 && (
            <div className="bg-orange-100 text-orange-800 px-4 py-1 text-xs font-bold text-center border-b border-orange-200">
              Bạn còn {daysLeft} ngày dùng thử miễn phí.
            </div>
          )
        )}
        {/* ----------------------- */}

        {activeTab !== 'debt' && activeTab !== 'loans' && (
          <header className="bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200/50">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {(activeTab === 'dashboard' || activeTab === 'transactions') && <FilterBar />}
            </div>

            <button
              onClick={() => {
                if (!checkPermission()) return;
                setEditingTransaction(null);
                setShowAddModal(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 sm:hover:bg-black text-white px-5 py-2.5 rounded-xl shadow-lg shadow-gray-300 transition-all active:scale-95 font-bold text-sm"
            >
              <PlusCircle size={18} /> <span className="sm:hidden md:inline">Thêm khoản chi</span>
            </button>
          </header>
        )}

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
                  checkPermission={checkPermission}
                />
              )}
              {activeTab === 'transactions' && (
                <TransactionContent
                  filtered={filteredTransactions} viewMonth={viewMonth} viewYear={viewYear}
                  search={search} setSearch={setSearch} filterCategory={filterCategory} setFilterCategory={setFilterCategory}
                  deleteTransaction={deleteTransaction}
                  onEdit={(tx) => { setEditingTransaction(tx); setShowAddModal(true); }}
                  allCategories={allCategories}
                  checkPermission={checkPermission}
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
                  updateCategoryName={updateCategoryName}
                  checkPermission={checkPermission}
                />
              )}
              {activeTab === 'recurring' && (
                <RecurringContent
                  recurringItems={recurringItems}
                  addRecurringItem={addRecurringItem}
                  updateRecurringItem={updateRecurringItem}
                  deleteRecurringItem={deleteRecurringItem}
                  allCategories={allCategories}
                  checkPermission={checkPermission}
                />
              )}
              {activeTab === 'loans' && (
                <LoanContent
                  loans={loans}
                  addLoan={addLoan}
                  updateLoan={updateLoan}
                  deleteLoan={deleteLoan}
                  formatCurrency={formatCurrency}
                  checkPermission={checkPermission}
                />
              )}
              {activeTab === 'debt' && (
                <DebtAuditContent
                  transactions={transactions}
                  allMonthlyIncome={allMonthlyIncome}
                  checkPermission={checkPermission}
                />
              )}
              {activeTab === 'habits' && (
                <HabitTracker user={user} />
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

      <TrialLimitModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onUpgrade={handleUpgrade}
      />

      {showAddModal && <AddTransactionModal onClose={() => { setShowAddModal(false); setEditingTransaction(null); }} transactionToEdit={editingTransaction} />}
    </div>
  );
}