import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList, Sector
} from 'recharts';
import { 
  LayoutDashboard, Wallet, Receipt, PlusCircle, Settings, 
  TrendingUp, TrendingDown, Search, Trash2, Save,
  Menu, X, Database, Calendar, Filter, AlertCircle, BarChart2, ArrowUpRight, ArrowDownRight,
  List, AlertTriangle, ChevronDown,
  Coffee, ShoppingBag, BookOpen, Home, Fuel, Film, MoreHorizontal, Briefcase, User
} from 'lucide-react';

// FIREBASE IMPORTS
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { 
  getFirestore, collection, addDoc, onSnapshot, query, 
  deleteDoc, doc, setDoc, serverTimestamp, increment 
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

// Use a fixed App ID for personal use
const appId = 'quan-ly-chi-tieu-personal';

// MAPPING CATEGORY TO ICONS
const CATEGORY_CONFIG = {
  eating: { icon: Coffee, label: 'Ăn uống', color: '#EF4444' },
  investment: { icon: TrendingUp, label: 'Đầu tư', color: '#10B981' },
  entertainment: { icon: Film, label: 'Giải trí', color: '#8B5CF6' },
  learning: { icon: BookOpen, label: 'Học tập', color: '#3B82F6' },
  living: { icon: Home, label: 'Nhà cửa', color: '#F59E0B' },
  fuel: { icon: Fuel, label: 'Đi lại', color: '#6366F1' },
  shopping: { icon: ShoppingBag, label: 'Mua sắm', color: '#EC4899' },
  other: { icon: MoreHorizontal, label: 'Khác', color: '#6B7280' },
};

const CATEGORIES = Object.keys(CATEGORY_CONFIG).map(key => ({
  id: key,
  name: CATEGORY_CONFIG[key].label,
  color: CATEGORY_CONFIG[key].color,
  icon: CATEGORY_CONFIG[key].icon
}));

const INITIAL_BUDGETS = {
  eating: 0,
  investment: 0,
  entertainment: 0,
  learning: 0,
  living: 0,
  fuel: 0,
  shopping: 0,
  other: 0
};

// UTILS
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatShortCurrency = (amount) => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'tr';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
  return amount;
};

// COMPONENTS
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

// iOS Friendly Select Component
const IOSSelect = ({ value, onChange, options, icon: Icon, className = "" }) => (
  <div className={`relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 transition-all ${className}`}>
    {Icon && <Icon size={18} className="absolute left-3 text-gray-400 pointer-events-none z-10" />}
    <select 
      value={value} 
      onChange={onChange}
      className={`w-full appearance-none bg-transparent py-2.5 ${Icon ? 'pl-10' : 'pl-4'} pr-10 text-sm font-semibold text-gray-700 outline-none cursor-pointer z-20 relative`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
      <ChevronDown size={16} className="text-gray-400" />
    </div>
  </div>
);

// --- PIE CHART ACTIVE SHAPE ---
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#374151" className="text-sm font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#6B7280" className="text-xs">
        {formatShortCurrency(value)} ({(percent * 100).toFixed(0)}%)
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius - 6}
        outerRadius={innerRadius - 2}
        fill={fill}
      />
    </g>
  );
};


export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState(INITIAL_BUDGETS);
  const [noteStats, setNoteStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // --- FILTER STATE ---
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  
  // --- CHART STATE ---
  const [chartMode, setChartMode] = useState('daily');
  const [chartCategoryFilter, setChartCategoryFilter] = useState('all');
  const [pieActiveIndex, setPieActiveIndex] = useState(0); // State for Pie Chart

  // --- 1. AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                throw new Error("No token provided");
            }
        } catch (error) {
            console.warn("Auth with token failed, falling back to anonymous:", error);
            try {
                await signInAnonymously(auth);
            } catch (anonError) {
                console.error("Anonymous auth failed:", anonError);
            }
        }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- 2. DATA SYNC ---
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const txQuery = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'transactions')
    );

    const unsubTx = onSnapshot(txQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setIsLoading(false);
    });

    const budgetRef = doc(db, 'artifacts', appId, 'public', 'data', 'budgets', 'config');
    const unsubBudget = onSnapshot(budgetRef, (docSnap) => {
      if (docSnap.exists()) {
        setBudgets(docSnap.data());
      }
    }, (error) => console.error("Error fetching budgets:", error));

    const notesRef = doc(db, 'artifacts', appId, 'public', 'data', 'stats', 'notes');
    const unsubNotes = onSnapshot(notesRef, (docSnap) => {
      if (docSnap.exists()) {
        setNoteStats(docSnap.data());
      }
    }, (error) => console.error("Error fetching note stats:", error));

    return () => {
      unsubTx();
      unsubBudget();
      unsubNotes();
    };
  }, [user]);

  // --- ACTIONS ---
  const addTransaction = async (newTx) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
        ...newTx,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      if (newTx.note && newTx.note.trim()) {
        const cleanNote = newTx.note.trim().replace(/\./g, '');
        if (cleanNote) {
          const notesRef = doc(db, 'artifacts', appId, 'public', 'data', 'stats', 'notes');
          await setDoc(notesRef, {
            [cleanNote]: increment(1)
          }, { merge: true });
        }
      }
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const deleteTransaction = async (id) => {
    if (!user) return;
    if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id));
      } catch (e) {
        console.error("Error deleting document: ", e);
      }
    }
  };

  const saveBudgetsToDb = async (newBudgets) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'budgets', 'config'), newBudgets);
      alert("Đã cập nhật ngân sách thành công!");
    } catch (e) {
      console.error("Error saving budget", e);
    }
  };

  // --- ANALYSIS LOGIC ---
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === parseInt(viewMonth) && d.getFullYear() === parseInt(viewYear);
    });
  }, [transactions, viewMonth, viewYear]);

  const previousMonthData = useMemo(() => {
    const prevDate = new Date(viewYear, parseInt(viewMonth) - 1, 1);
    const pMonth = prevDate.getMonth();
    const pYear = prevDate.getFullYear();
    
    const prevTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === pMonth && d.getFullYear() === pYear;
    });

    const totalPrev = prevTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    return { total: totalPrev, month: pMonth + 1, year: pYear };
  }, [transactions, viewMonth, viewYear]);

  const currentYearTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === parseInt(viewYear);
    });
  }, [transactions, viewYear]);

  const totalSpent = currentMonthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const spendingDiff = totalSpent - previousMonthData.total;

  const totalIncurred = currentMonthTransactions
    .filter(t => t.isIncurred === true)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const spendingByCategory = useMemo(() => {
    const data = {};
    CATEGORIES.forEach(c => data[c.id] = 0);
    currentMonthTransactions.forEach(t => {
      if (data[t.category] !== undefined) data[t.category] += Number(t.amount);
    });
    
    const total = Object.values(data).reduce((a, b) => a + b, 0);

    return Object.keys(data)
      .map(key => ({
        id: key,
        name: CATEGORY_CONFIG[key]?.label,
        value: data[key],
        color: CATEGORY_CONFIG[key]?.color,
        budget: budgets[key] || 0,
        percentage: total > 0 ? (data[key] / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions, budgets]);

  const dailySpendingData = useMemo(() => {
    const daysInMonth = new Date(viewYear, parseInt(viewMonth) + 1, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => ({
      name: i + 1,
      amount: 0,
      fullLabel: `Ngày ${i + 1}/${parseInt(viewMonth) + 1}`
    }));

    currentMonthTransactions.forEach(t => {
      if (chartCategoryFilter !== 'all' && t.category !== chartCategoryFilter) return;
      const d = new Date(t.date);
      const dayIndex = d.getDate() - 1;
      if (data[dayIndex]) {
        data[dayIndex].amount += Number(t.amount);
      }
    });
    return data;
  }, [currentMonthTransactions, viewMonth, viewYear, chartCategoryFilter]);

  const monthlySpendingData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      name: `T${i + 1}`,
      amount: 0,
      fullLabel: `Tháng ${i + 1}/${viewYear}`
    }));

    currentYearTransactions.forEach(t => {
      if (chartCategoryFilter !== 'all' && t.category !== chartCategoryFilter) return;
      const d = new Date(t.date);
      const monthIndex = d.getMonth();
      if (data[monthIndex]) {
        data[monthIndex].amount += Number(t.amount);
      }
    });
    return data;
  }, [currentYearTransactions, viewYear, chartCategoryFilter]);

  // --- SUB-COMPONENTS ---
  const FilterBar = () => {
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i, label: `Tháng ${i + 1}` }));
    const yearOptions = Array.from({ length: 5 }, (_, i) => {
        const y = new Date().getFullYear() - 2 + i;
        return { value: y, label: `Năm ${y}` };
    });

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-36">
                <IOSSelect 
                    icon={Calendar}
                    value={viewMonth}
                    onChange={(e) => setViewMonth(parseInt(e.target.value))}
                    options={monthOptions}
                />
            </div>
            <div className="w-full sm:w-32">
                 <IOSSelect 
                    value={viewYear}
                    onChange={(e) => setViewYear(parseInt(e.target.value))}
                    options={yearOptions}
                />
            </div>
        </div>
    );
  };

  const DashboardView = () => {
    const currentChartData = chartMode === 'daily' ? dailySpendingData : monthlySpendingData;
    const chartColor = chartMode === 'daily' ? '#3B82F6' : '#8B5CF6';

    const targetCategories = ['eating', 'entertainment', 'fuel', 'shopping'];
    const alerts = useMemo(() => {
      const results = [];
      spendingByCategory.forEach(item => {
        if (targetCategories.includes(item.id) && item.budget > 0) {
          const ratio = item.value / item.budget;
          if (ratio >= 1) {
            results.push({
              id: item.id,
              name: item.name,
              ratio: ratio,
              type: 'danger',
              message: `Đã hết ngân sách ${item.name}`
            });
          } else if (ratio >= 0.8) {
            results.push({
              id: item.id,
              name: item.name,
              ratio: ratio,
              type: 'warning',
              message: `${item.name} sắp hết hạn mức`
            });
          }
        }
      });
      return results;
    }, [spendingByCategory]);

    const pieData = spendingByCategory.filter(i => i.value > 0);

    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* User Welcome */}
        <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Xin chào, Tuấn Phan</h2>
            <p className="text-gray-500">Đây là tình hình tài chính tháng này của bạn.</p>
        </div>

        {/* Summary Cards */}
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
               <div className="p-2.5 bg-green-50 rounded-xl text-green-600">
                <Wallet size={24} />
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div 
                    className="h-full rounded-full bg-green-500" 
                    style={{width: `${totalBudget > 0 ? Math.min((totalSpent/totalBudget)*100, 100) : 0}%`}}
                ></div>
            </div>
          </Card>
          
          <Card>
             <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Phát sinh</p>
                <h3 className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalIncurred)}</h3>
              </div>
               <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600">
                <AlertCircle size={24} />
              </div>
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
               <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                <TrendingUp size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* --- ALERTS --- */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 rounded-xl border-l-4 shadow-sm flex items-center gap-3 animate-fade-in ${
                  alert.type === 'danger' 
                    ? 'bg-red-50 border-red-500 text-red-800' 
                    : 'bg-yellow-50 border-yellow-500 text-yellow-800'
                }`}
              >
                {alert.type === 'danger' ? <AlertCircle size={20} /> : <AlertTriangle size={20} />}
                <div className="flex-1">
                  <p className="font-bold text-sm">{alert.message}</p>
                  <p className="text-xs opacity-80">Đã dùng {(alert.ratio * 100).toFixed(0)}% ngân sách.</p>
                </div>
              </div>
            ))}
          </div>
        )}
  
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="min-h-[420px] flex flex-col">
            <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <PieChart size={20} className="text-gray-400" /> Phân bổ chi tiêu
            </h4>
            
            <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Interactive Donut Chart */}
              <div className="h-64 w-64 relative flex-shrink-0">
                 {totalSpent > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        activeIndex={pieActiveIndex}
                        activeShape={renderActiveShape}
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        dataKey="value"
                        onMouseEnter={(_, index) => setPieActiveIndex(index)}
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-gray-400 border-4 border-slate-100 rounded-full">
                     <Database size={32} className="mb-2 opacity-20" />
                     <p className="text-xs">Chưa có dữ liệu</p>
                   </div>
                 )}
              </div>

              {/* Custom Legend */}
              <div className="flex-1 w-full overflow-y-auto max-h-64 pr-2">
                 <div className="space-y-3">
                    {pieData.map((entry, index) => (
                      <div 
                        key={entry.id} 
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${pieActiveIndex === index ? 'bg-slate-50 border border-slate-100' : 'hover:bg-slate-50'}`}
                        onMouseEnter={() => setPieActiveIndex(index)}
                      >
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: entry.color}}></div>
                            <span className={`text-sm ${pieActiveIndex === index ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                              {entry.name}
                            </span>
                         </div>
                         <div className="text-right">
                           <p className={`text-sm ${pieActiveIndex === index ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                             {formatShortCurrency(entry.value)}
                           </p>
                           <p className="text-xs text-gray-400">{(entry.percentage).toFixed(1)}%</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </Card>
  
          <Card className="min-h-[420px]">
            <div className="flex flex-col gap-3 mb-4">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  <BarChart2 size={20} className="text-gray-400" />
                  Xu hướng chi tiêu
                </h4>
                
                <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-bold w-full sm:w-auto">
                  <button 
                    onClick={() => setChartMode('daily')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md transition-all ${chartMode === 'daily' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Ngày
                  </button>
                  <button 
                    onClick={() => setChartMode('monthly')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md transition-all ${chartMode === 'monthly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Tháng
                  </button>
                </div>
              </div>
              
              <div className="self-end w-full sm:w-auto sm:w-40">
                 <IOSSelect
                   value={chartCategoryFilter}
                   onChange={(e) => setChartCategoryFilter(e.target.value)}
                   options={[
                     {value: "all", label: "Tất cả mục"},
                     {value: "eating", label: "Ăn uống"},
                     {value: "entertainment", label: "Giải trí"},
                     {value: "fuel", label: "Đi lại"},
                     {value: "shopping", label: "Mua sắm"}
                   ]}
                 />
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{fontSize: 10, fill: '#94A3B8'}} 
                    axisLine={false} 
                    tickLine={false}
                    interval={chartMode === 'daily' ? 2 : 0} 
                  />
                  <YAxis hide />
                  <RechartsTooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(label, payload) => payload[0]?.payload.fullLabel || label}
                    cursor={{fill: '#F8FAFC'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill={chartColor} 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* --- ACTUAL VS BUDGET CHART (RESTORED) --- */}
        <Card>
          <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Settings size={20} className="text-gray-400" /> Thực tế vs Ngân sách
          </h4>
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={spendingByCategory} 
                layout="vertical" 
                margin={{left: 40, right: 60}} 
                barCategoryGap={24}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{fontSize: 12, fill: '#4B5563', fontWeight: 600}} 
                  width={80}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                />
                <Legend />
                <Bar dataKey="value" name="Thực tế" barSize={20} radius={[0, 6, 6, 0]}>
                   {
                      spendingByCategory.map((entry, index) => {
                        let barColor = '#3B82F6'; // Default blue
                        if (entry.budget > 0) {
                          const ratio = entry.value / entry.budget;
                          if (ratio > 1) {
                            barColor = '#EF4444'; // Red (>100%)
                          } else if (ratio >= 0.8) {
                            barColor = '#F59E0B'; // Orange (80-100%)
                          }
                        }
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })
                   }
                   <LabelList 
                     dataKey="value" 
                     position="right" 
                     formatter={(val) => val > 0 ? formatShortCurrency(val) : ''} 
                     style={{fontSize: '11px', fontWeight: 'bold', fill: '#6B7280'}} 
                   />
                </Bar>
                <Bar dataKey="budget" name="Ngân sách" fill="#F3F4F6" barSize={20} radius={[0, 6, 6, 0]}>
                   <LabelList 
                     dataKey="budget" 
                     position="right" 
                     formatter={(val) => val > 0 ? formatShortCurrency(val) : ''} 
                     style={{fontSize: '11px', fill: '#9CA3AF'}} 
                   />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const AddTransactionModal = ({ onClose }) => {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: 'eating',
      note: '',
      isIncurred: false
    });
    const [suggestions, setSuggestions] = useState([]);

    const handleNoteChange = (e) => {
      const val = e.target.value;
      setFormData({...formData, note: val});
      if (val.length >= 3) {
        const matches = Object.entries(noteStats)
          .filter(([note, count]) => count >= 2 && note.toLowerCase().includes(val.toLowerCase()))
          .sort((a, b) => b[1] - a[1])
          .map(([note]) => note)
          .slice(0, 5);
        setSuggestions(matches);
      } else {
        setSuggestions([]);
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.amount || !formData.date) return;
      addTransaction(formData);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden my-4">
          <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Thêm giao dịch</h3>
            <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"><X size={18} className="text-gray-600"/></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Số tiền</label>
              <div className="relative">
                <input 
                  type="number" 
                  required
                  className="w-full pl-4 pr-10 py-4 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 outline-none text-2xl font-bold text-gray-800 transition-all bg-slate-50 focus:bg-white"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="0"
                  autoFocus
                />
                <span className="absolute right-4 top-5 text-gray-400 font-bold">VNĐ</span>
              </div>
            </div>
            
            <div 
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.isIncurred ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`} 
              onClick={() => setFormData({...formData, isIncurred: !formData.isIncurred})}
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${formData.isIncurred ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`}>
                {formData.isIncurred && <X size={14} className="text-white" />}
              </div>
              <label className="text-sm font-medium text-gray-700 cursor-pointer select-none">Đánh dấu là chi phí phát sinh</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ngày</label>
                <input 
                  type="date" 
                  required
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-medium text-gray-700 appearance-none bg-white"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Danh mục</label>
                <div className="relative">
                  <select 
                    className="w-full p-3 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white text-sm font-medium text-gray-700 appearance-none"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Nội dung</label>
              <input 
                type="text" 
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-medium text-gray-700 placeholder:text-gray-300"
                value={formData.note}
                onChange={handleNoteChange}
                placeholder="Nhập ghi chú..."
              />
              {/* Suggestion Dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-100 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto animate-fade-in py-2">
                  {suggestions.map((s, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { setFormData({...formData, note: s}); setSuggestions([]); }}
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2"
                    >
                      <List size={14} className="text-gray-400" />
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transform active:scale-[0.98] transition-all">
              Lưu Giao Dịch
            </button>
          </form>
        </div>
      </div>
    );
  };

  const TransactionView = () => {
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    const filtered = currentMonthTransactions.filter(t => {
      const note = t.note ? t.note.toLowerCase() : '';
      const amount = t.amount ? t.amount.toString() : '';
      const matchSearch = note.includes(search.toLowerCase()) || amount.includes(search);
      const matchCat = filterCategory === 'all' || t.category === filterCategory;
      return matchSearch && matchCat;
    });

    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Receipt size={20} />
             </div>
             <div>
                 <h3 className="font-bold text-gray-800">Sổ giao dịch</h3>
                 <p className="text-xs text-gray-500">Tháng {parseInt(viewMonth) + 1}/{viewYear}</p>
             </div>
           </div>
           <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-bold text-gray-600 whitespace-nowrap">
             {filtered.length} giao dịch
           </span>
        </div>

        <Card className="p-0 overflow-hidden border-0 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="w-full pl-10 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <div className="relative">
                <select 
                  className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium text-gray-600 appearance-none"
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                >
                  <option value="all">Tất cả danh mục</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
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
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group bg-white">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                      {new Date(tx.date).getDate()}/{new Date(tx.date).getMonth() + 1}
                      {tx.isIncurred && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-orange-400" title="Chi phí phát sinh"></span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={CATEGORIES.find(c => c.id === tx.category)?.color || '#999'}>
                        {CATEGORIES.find(c => c.id === tx.category)?.name}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{tx.note}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800">{formatCurrency(tx.amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => deleteTransaction(tx.id)}
                        className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 bg-white">
                      <div className="flex flex-col items-center justify-center text-gray-300 gap-2">
                        <Search size={40} strokeWidth={1} />
                        <p className="text-sm">Không tìm thấy giao dịch nào</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const BudgetView = () => {
    const [tempBudgets, setTempBudgets] = useState(budgets);
    useEffect(() => { setTempBudgets(budgets); }, [budgets]);

    return (
      <div className="space-y-8 animate-fade-in pb-24">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h3 className="text-2xl font-bold text-gray-800">Cài đặt ngân sách</h3>
                <p className="text-gray-500">Phân bổ hạn mức chi tiêu cho từng danh mục</p>
            </div>
            <button 
                onClick={() => saveBudgetsToDb(tempBudgets)}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black font-bold shadow-lg transition-all active:scale-95 w-full md:w-auto justify-center"
            >
                <Save size={18} /> Lưu thay đổi
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {CATEGORIES.map(cat => {
            const currentVal = tempBudgets[cat.id] || 0;
            const Icon = cat.icon;
            
            return (
              <div key={cat.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                   <Icon size={80} color={cat.color} />
                </div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="mb-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm mb-3" style={{backgroundColor: cat.color}}>
                            <Icon size={24} />
                        </div>
                        <h4 className="font-bold text-lg text-gray-800">{cat.name}</h4>
                    </div>

                    <div className="relative mt-auto">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Hạn mức tháng</label>
                        <input 
                            type="number" 
                            className="w-full text-xl font-bold border-b-2 border-slate-100 focus:border-gray-800 outline-none py-2 transition-colors bg-transparent text-gray-800"
                            value={currentVal}
                            onChange={(e) => setTempBudgets({...tempBudgets, [cat.id]: Number(e.target.value)})}
                            placeholder="0"
                        />
                        <span className="absolute right-0 bottom-3 text-xs text-gray-400 font-bold">VNĐ</span>
                    </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  // --- MAIN RENDER ---
  const SidebarItem = ({ id, label, icon: Icon, active }) => (
    <button 
      onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${
        active 
        ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon size={20} className={active ? 'text-white' : 'text-gray-400'} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans flex flex-col md:flex-row overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-white px-5 py-4 flex justify-between items-center sticky top-0 z-30 border-b border-gray-100">
        <h1 className="font-bold text-lg text-gray-900 flex items-center gap-2">Tuấn Phan</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><Menu size={24}/></button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl md:shadow-none`}>
        <div className="p-8 border-b border-slate-50">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                        T
                    </div>
                    <div>
                        <h1 className="font-extrabold text-xl text-gray-900 tracking-tight leading-none">Tuấn Phan</h1>
                        <p className="text-xs text-gray-400 font-medium mt-1">Personal Finance</p>
                    </div>
                </div>
                {/* Mobile Close Button */}
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                >
                  <X size={20} />
                </button>
            </div>
        </div>
        
        <nav className="p-6 space-y-2 flex-1">
          <SidebarItem id="dashboard" label="Tổng quan" icon={LayoutDashboard} active={activeTab === 'dashboard'} />
          <SidebarItem id="transactions" label="Sổ giao dịch" icon={Receipt} active={activeTab === 'transactions'} />
          <SidebarItem id="budget" label="Cài đặt ngân sách" icon={Settings} active={activeTab === 'budget'} />
        </nav>
        
        {/* Sidebar Footer */}
        <div className="p-6">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 border border-slate-100">
             <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
               <Database size={14} />
             </div>
             <div>
               <p className="text-xs font-bold text-gray-700">Trạng thái</p>
               <p className="text-[10px] text-green-600 flex items-center gap-1 font-bold uppercase tracking-wider">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
               </p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 relative scroll-smooth">
        {/* Global Header */}
        <header className="bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200/50">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {(activeTab === 'dashboard' || activeTab === 'transactions') && <FilterBar />}
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl shadow-lg shadow-gray-300 transition-all active:scale-95 font-bold text-sm"
          >
            <PlusCircle size={18} /> <span className="sm:hidden md:inline">Thêm khoản chi</span>
          </button>
        </header>

        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto pb-32">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-300">
              <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mb-6 opacity-20"></div>
              <p className="font-medium animate-pulse">Đang đồng bộ dữ liệu...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'transactions' && <TransactionView />}
              {activeTab === 'budget' && <BudgetView />}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      {showAddModal && <AddTransactionModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}