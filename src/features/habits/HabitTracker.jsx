// src/features/habits/HabitTracker.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, CheckCircle2, Flame, Calendar as CalendarIcon, 
  Trash2, X, Trophy, Activity, LayoutGrid 
} from 'lucide-react';
import { 
  collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp 
} from "firebase/firestore";
import { db } from '../../lib/firebase'; // Đảm bảo import đúng đường dẫn file firebase config của bạn

// --- HELPER: Tạo path chuẩn theo yêu cầu ---
const getHabitPath = (user) => {
  if (!user) return null;
  const basePath = '/artifacts/quan-ly-chi-tieu-personal';
  if (user.isAnonymous) {
    return `${basePath}/public/data/habits`; // Collection habits
  }
  return `${basePath}/users/${user.uid}/habits`; // Collection habits
};

// --- HELPER: Tính chuỗi streak ---
const calculateStreak = (history = {}) => {
  let streak = 0;
  const today = new Date();
  // Kiểm tra từ hôm nay lùi về quá khứ
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    
    // Nếu hôm nay chưa tick thì không tính là gãy streak, chỉ xét từ hôm qua
    if (i === 0 && !history[dateKey]) continue;

    if (history[dateKey]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

// --- HELPER: Lấy 7 ngày gần nhất để hiển thị ---
const getLast7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i)); // Sắp xếp từ quá khứ đến hiện tại
    return d;
  });
};

export default function HabitTracker({ user }) {
  const [habits, setHabits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- REALTIME SYNC ---
  useEffect(() => {
    if (!user) return;
    const path = getHabitPath(user);
    
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sắp xếp theo ngày tạo mới nhất
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHabits(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- ACTIONS ---
  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const path = getHabitPath(user);
    await addDoc(collection(db, path), {
      name: newHabitName.trim(),
      history: {}, // Map: { "2023-12-20": true }
      createdAt: serverTimestamp(),
      color: '#3B82F6' // Default Blue
    });
    
    setNewHabitName('');
    setShowModal(false);
  };

  const toggleCheck = async (habit, dateObj) => {
    const dateKey = dateObj.toISOString().split('T')[0];
    const path = getHabitPath(user);
    const habitRef = doc(db, path, habit.id);
    
    const isDone = habit.history?.[dateKey];
    
    // Update nested field trong Firestore map
    await updateDoc(habitRef, {
      [`history.${dateKey}`]: !isDone
    });
  };

  const deleteHabit = async (id) => {
    if (!confirm('Bạn muốn xóa thói quen này và toàn bộ lịch sử?')) return;
    const path = getHabitPath(user);
    await deleteDoc(doc(db, path, id));
  };

  const weekDays = getLast7Days();
  const todayKey = new Date().toISOString().split('T')[0];

  if (isLoading) return <div className="p-8 text-center text-gray-400">Đang tải dữ liệu thói quen...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="text-blue-600" /> Theo dõi thói quen
          </h2>
          <p className="text-gray-500">Xây dựng kỷ luật nhỏ mỗi ngày để tạo thành công lớn.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black font-bold shadow-lg shadow-gray-300 transition-all active:scale-95 w-full md:w-auto justify-center"
        >
          <PlusCircle size={18} /> Thêm thói quen mới
        </button>
      </div>

      {/* STATS SUMMARY (Optional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <h3 className="text-indigo-100 text-sm font-bold uppercase">Tổng thói quen</h3>
          <p className="text-4xl font-bold mt-2">{habits.length}</p>
          <LayoutGrid className="absolute right-[-10px] bottom-[-10px] opacity-20" size={80} />
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
           <h3 className="text-gray-400 text-sm font-bold uppercase">Hoàn thành hôm nay</h3>
           <p className="text-4xl font-bold mt-2 text-green-600">
             {habits.filter(h => h.history?.[todayKey]).length} <span className="text-xl text-gray-400">/ {habits.length}</span>
           </p>
        </div>
      </div>

      {/* HABIT LIST */}
      <div className="grid grid-cols-1 gap-4">
        {habits.map(habit => {
          const streak = calculateStreak(habit.history);
          const isDoneToday = habit.history?.[todayKey];

          return (
            <div key={habit.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                {/* Info Section */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between md:justify-start gap-3">
                    <h3 className={`text-lg font-bold ${isDoneToday ? 'text-gray-800' : 'text-gray-600'}`}>{habit.name}</h3>
                    <div className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                      <Flame size={14} fill="currentColor" /> {streak} ngày
                    </div>
                  </div>
                  
                  {/* Calendar Bubbles (Mobile/Desktop friendly) */}
                  <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 hide-scrollbar">
                    {weekDays.map((day, idx) => {
                       const dKey = day.toISOString().split('T')[0];
                       const isDone = habit.history?.[dKey];
                       const isToday = dKey === todayKey;
                       
                       return (
                         <button 
                           key={idx}
                           onClick={() => toggleCheck(habit, day)}
                           className={`flex flex-col items-center gap-1 min-w-[40px] transition-all group ${isToday ? 'scale-110' : ''}`}
                           title={dKey}
                         >
                           <span className="text-[10px] font-bold text-gray-400 uppercase">{day.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isDone 
                             ? 'bg-green-500 border-green-500 text-white shadow-sm shadow-green-200' 
                             : isToday 
                               ? 'bg-white border-blue-400 border-dashed text-gray-300 hover:bg-blue-50' 
                               : 'bg-slate-50 border-transparent text-slate-300'
                           }`}>
                             {isDone && <CheckCircle2 size={20} />}
                           </div>
                         </button>
                       )
                    })}
                  </div>
                </div>

                {/* Action Section */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 mt-2 md:mt-0">
                   <button 
                     onClick={() => toggleCheck(habit, new Date())}
                     className={`flex-1 md:flex-none px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${isDoneToday 
                       ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                       : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                   >
                     {isDoneToday ? 'Đã xong' : 'Check-in'}
                   </button>
                   <button 
                     onClick={() => deleteHabit(habit.id)}
                     className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>

              </div>
            </div>
          );
        })}

        {habits.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <Trophy size={48} className="mb-4 opacity-20" />
            <p>Chưa có thói quen nào được tạo.</p>
            <button onClick={() => setShowModal(true)} className="text-blue-600 font-bold hover:underline mt-2">Tạo thói quen đầu tiên</button>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Tạo thói quen mới</h3>
                <button onClick={() => setShowModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18}/></button>
             </div>
             <form onSubmit={handleAddHabit} className="p-6 space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên thói quen</label>
                   <input 
                     required 
                     type="text" 
                     autoFocus
                     className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-gray-800 font-medium" 
                     placeholder="Ví dụ: Đọc sách, Chạy bộ, Uống nước..." 
                     value={newHabitName} 
                     onChange={e => setNewHabitName(e.target.value)} 
                   />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-transform active:scale-95">
                    Bắt đầu ngay
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}