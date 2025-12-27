// src/features/habits/HabitApp.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PlusCircle, CheckCircle2, Trash2, X, Activity, ArrowLeft,
  LayoutDashboard, Menu, LogOut, Calendar as CalendarIcon,
  Settings, BarChart2, ChevronLeft, ChevronRight, Check, Edit,
  RotateCcw, Filter, MousePointer2, Target, Flag, CalendarDays, ChevronDown, Lock, Crown
} from 'lucide-react';
import {
  collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import { useTrial } from '../../hooks/useTrial';
import TrialLimitModal from '../../components/common/TrialLimitModal';
import UserProfileModal from '../../components/common/UserProfileModal';

// --- CONSTANTS ---
const GOAL_UNITS = [
  { value: 'lần', label: 'Lần' },
  { value: 'phút', label: 'Phút' },
  { value: 'giờ', label: 'Giờ' },
  { value: 'km', label: 'Km' },
  { value: 'm', label: 'Mét' },
  { value: 'bước', label: 'Bước' },
  { value: 'trang', label: 'Trang sách' },
  { value: 'lit', label: 'Lit' },
  { value: 'ml', label: 'ml' },
  { value: 'cal', label: 'Calories' },
  { value: 'kg', label: 'Kg' },
  { value: 'người', label: 'Người' }
];

const FREQUENCY_TYPES = [
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'specific_days', label: 'Các ngày trong tuần' },
  { value: 'times_per_week', label: 'Số ngày mỗi tuần' },
  { value: 'specific_dates', label: 'Ngày cố định trong tháng' },
  { value: 'times_per_month', label: 'Số ngày mỗi tháng' },
];

const WEEKDAYS = [
  { key: 1, label: 'T2' }, { key: 2, label: 'T3' }, { key: 3, label: 'T4' },
  { key: 4, label: 'T5' }, { key: 5, label: 'T6' }, { key: 6, label: 'T7' },
  { key: 0, label: 'CN' }
];

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#71717A', // Zinc
];

// --- HELPER UTILS ---

// 1. Hàm lấy key ngày chuẩn Local Time (YYYY-MM-DD)
const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Hàm lấy base path chung cho cả habits và goals
const getBasePath = (user) => {
  if (!user) return null;
  const basePath = '/artifacts/quan-ly-chi-tieu-personal';
  return user.isAnonymous
    ? `${basePath}/public/data`
    : `${basePath}/users/${user.uid}`;
};

// Giữ lại hàm cũ để tương thích nếu cần, nhưng trỏ về hàm mới
const getHabitPath = (user) => {
  const base = getBasePath(user);
  return base ? `${base}/habits` : null;
};

const getRandomColor = () => {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [hour, min] = timeStr.split(':');
  return `${hour}:${min}`;
};

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

// Check if habit should appear on a specific date based on frequency AND date range
const isHabitDueOnDate = (habit, date) => {
  // 1. CHECK DATE RANGE (MỚI THÊM)
  // Chuyển date đang xét về đầu ngày để so sánh chính xác
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  // Nếu có ngày bắt đầu
  if (habit.startDate) {
    const start = new Date(habit.startDate);
    start.setHours(0, 0, 0, 0);
    if (checkDate < start) return false; // Chưa đến ngày bắt đầu
  }

  // Nếu có ngày kết thúc
  if (habit.endDate) {
    const end = new Date(habit.endDate);
    end.setHours(0, 0, 0, 0);
    if (checkDate > end) return false; // Đã quá ngày kết thúc
  }

  // 2. CHECK FREQUENCY (LOGIC CŨ)
  const type = habit.freqType || 'daily';
  const val = habit.freqValue;

  if (type === 'daily') return true;
  if (type === 'times_per_week') return true;
  if (type === 'times_per_month') return true;

  if (type === 'specific_days') {
    if (Array.isArray(val)) return val.includes(date.getDay());
    return true;
  }

  if (type === 'specific_dates') {
    if (Array.isArray(val)) return val.includes(date.getDate());
    return true;
  }
  return true;
};

// --- COMPONENT: INFINITE DATE CAROUSEL ---
const DateCarousel = ({ selectedDate, onSelectDate, habits }) => {
  const [viewDate, setViewDate] = useState(() => getMonday(selectedDate));
  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    const newMonday = getMonday(selectedDate);
    if (newMonday.getTime() !== viewDate.getTime()) {
      setViewDate(newMonday);
    }
  }, [selectedDate]);

  const weeksData = useMemo(() => {
    const weeks = [-1, 0, 1];
    return weeks.map(offset => {
      const monday = new Date(viewDate);
      monday.setDate(viewDate.getDate() + (offset * 7));
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
      }
      return { offset, days, key: monday.toISOString() };
    });
  }, [viewDate]);

  // Touch Handlers
  const handleTouchStart = (e) => {
    setIsAnimating(false);
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    setDragX(e.touches[0].clientX - touchStartX.current);
  };
  const handleTouchEnd = () => {
    setIsAnimating(true);
    const threshold = window.innerWidth * 0.25;
    if (dragX > threshold) {
      setDragX(window.innerWidth);
      setTimeout(() => {
        setIsAnimating(false);
        setDragX(0);
        const prevWeek = new Date(viewDate);
        prevWeek.setDate(prevWeek.getDate() - 7);
        setViewDate(prevWeek);
      }, 300);
    } else if (dragX < -threshold) {
      setDragX(-window.innerWidth);
      setTimeout(() => {
        setIsAnimating(false);
        setDragX(0);
        const nextWeek = new Date(viewDate);
        nextWeek.setDate(nextWeek.getDate() + 7);
        setViewDate(nextWeek);
      }, 300);
    } else {
      setDragX(0);
    }
  };

  // Mouse Handlers (Desktop)
  const handleMouseDown = (e) => {
    setIsAnimating(false);
    touchStartX.current = e.clientX;
    containerRef.current.style.cursor = 'grabbing';
    const onMouseMove = (moveEvent) => setDragX(moveEvent.clientX - touchStartX.current);
    const onMouseUp = (upEvent) => {
      setIsAnimating(true);
      containerRef.current.style.cursor = 'grab';
      const diff = upEvent.clientX - touchStartX.current;
      const threshold = window.innerWidth * 0.25;
      if (diff > threshold) {
        setDragX(window.innerWidth);
        setTimeout(() => {
          setIsAnimating(false); setDragX(0);
          const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d);
        }, 300);
      } else if (diff < -threshold) {
        setDragX(-window.innerWidth);
        setTimeout(() => {
          setIsAnimating(false); setDragX(0);
          const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d);
        }, 300);
      } else {
        setDragX(0);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const getDailyProgress = (date) => {
    const visibleHabits = habits.filter(h => isHabitDueOnDate(h, date));
    if (visibleHabits.length === 0) return 0;
    const dateKey = getLocalDateKey(date);
    const completedCount = visibleHabits.filter(h => (h.history?.[dateKey] || 0) === 100).length;
    return (completedCount / visibleHabits.length) * 100;
  };

  const daysLabel = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const realToday = new Date();

  return (
    <div
      className="relative w-full overflow-hidden select-none cursor-grab active:cursor-grabbing touch-pan-y"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`flex flex-row w-[300%] ${isAnimating ? 'transition-transform duration-300 ease-out' : ''}`}
        style={{ transform: `translateX(calc(-33.333% + ${dragX}px))` }}
      >
        {weeksData.map((week) => (
          <div key={week.key} className="w-1/3 flex justify-between px-1 py-2">
            {week.days.map((date, idx) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === realToday.toDateString();
              const percent = getDailyProgress(date);
              const size = 32, strokeWidth = 3, center = size / 2, radius = center - strokeWidth, circumference = 2 * Math.PI * radius;
              const offset = circumference - (percent / 100) * circumference;

              return (
                <div key={idx} className="flex-1 flex justify-center relative">
                  <button
                    onClick={() => { if (Math.abs(dragX) < 5) onSelectDate(date); }}
                    className={`flex flex-col items-center justify-center rounded-xl w-[48px] h-[72px] md:w-[60px] md:h-[84px] transition-all
                        ${isSelected ? 'bg-gray-900 text-white shadow-lg transform -translate-y-1' : 'bg-transparent text-gray-400'}
                      `}
                  >
                    <span className="text-[10px] font-bold uppercase mb-1">{daysLabel[idx]}</span>
                    <div className="relative w-[32px] h-[32px] flex items-center justify-center">
                      <svg className="absolute inset-0 transform -rotate-90" width={size} height={size}>
                        <circle cx={center} cy={center} r={radius} stroke={isSelected ? "#374151" : "#F1F5F9"} strokeWidth={strokeWidth} fill="none" />
                        {percent > 0 && (
                          <circle cx={center} cy={center} r={radius} stroke="#3B82F6" strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
                        )}
                      </svg>
                      <span className={`text-sm font-bold relative z-10 ${isSelected ? 'text-white' : 'text-gray-800'}`}>{date.getDate()}</span>
                    </div>
                  </button>
                  {isToday && !isSelected && <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- VIEW COMPONENTS (REPORT) ---

// 1. Weekly View (Đã cập nhật Header Thứ)
const WeeklyView = ({ habits, currentDate, navigateDate }) => {
  const monday = getMonday(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 w-full overflow-hidden">
      {/* Header Điều hướng tuần */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">Tuần này</h4>
        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg text-xs font-bold text-gray-600">
          <button onClick={() => navigateDate(-7)}><ChevronLeft size={16} /></button>
          <span>{weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} - {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1}</span>
          <button onClick={() => navigateDate(7)}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* DÒNG TIÊU ĐỀ THỨ (THÊM MỚI) */}
      <div className="grid grid-cols-[40%_repeat(7,1fr)] md:grid-cols-[200px_repeat(7,1fr)] gap-1 mb-3 pb-2 border-b border-slate-100">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Thói quen</div>
        {weekDays.map((d, i) => {
          const isToday = new Date().toDateString() === d.toDateString();
          return (
            <div key={i} className="flex flex-col items-center justify-center gap-1">
              <span className={`text-[10px] md:text-xs font-extrabold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                {dayLabels[i]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Danh sách thói quen */}
      <div className="space-y-2">
        {habits.map(habit => (
          <div key={habit.id} className="grid grid-cols-[40%_repeat(7,1fr)] md:grid-cols-[200px_repeat(7,1fr)] gap-1 items-center border-b border-slate-50 pb-2 last:border-0">
            <div className="flex items-center gap-1.5 pr-1 overflow-hidden">
              <span className="text-sm">{habit.icon}</span>
              <span className="text-xs font-semibold text-gray-700 truncate">{habit.name}</span>
            </div>
            {weekDays.map((d, i) => {
              const dateKey = getLocalDateKey(d);
              const isDone = (habit.history?.[dateKey] || 0) === 100;
              return (
                <div key={i} className="flex justify-center h-full items-center">
                  <div className={`w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center transition-all ${isDone ? 'bg-green-500 text-white shadow-sm scale-100' : 'bg-slate-50 scale-90'}`}>
                    {isDone && <Check size={14} strokeWidth={4} />}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// 2. Monthly View
const MonthlyView = ({ habits, currentDate, navigateDate }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-center items-center gap-4 mb-2">
        <button onClick={() => navigateDate(-30)} className="p-1.5 bg-white rounded-full shadow-sm hover:bg-slate-50"><ChevronLeft size={18} /></button>
        <h3 className="text-lg font-bold text-gray-800 bg-slate-100 px-4 py-1 rounded-lg">{currentDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => navigateDate(30)} className="p-1.5 bg-white rounded-full shadow-sm hover:bg-slate-50"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {habits.map(habit => {
          const completedCount = monthDays.filter(d => {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            return (habit.history?.[dateKey] || 0) === 100;
          }).length;

          return (
            <div key={habit.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm w-full">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                <h4 className="font-bold text-sm text-gray-800 flex items-center gap-1.5 truncate"><span className="text-lg">{habit.icon || '✨'}</span> {habit.name}</h4>
                <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">{completedCount}d</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map(d => {
                  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isDone = (habit.history?.[dateKey] || 0) === 100;
                  return <div key={d} className={`aspect-square rounded-sm md:rounded-md flex items-center justify-center text-[9px] md:text-[10px] font-bold ${isDone ? 'bg-green-500 text-white' : 'bg-slate-50 text-slate-300'}`}>{d}</div>
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

// 3. Yearly View (Đã cập nhật Dropdown chuẩn iOS)
const YearlyView = ({ habits, year, setYear }) => {
  const availableYears = [2025, 2026, 2027, 2028];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 w-full overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800">Tiến độ năm</h3>

        {/* --- DROPDOWN CHỌN NĂM (FIX UI IOS) --- */}
        <div className="relative">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            // appearance-none: Tắt style mặc định của iOS
            // pr-9: Chừa chỗ cho icon mũi tên bên phải
            className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-gray-700 font-bold text-xs md:text-sm py-2 pl-3 pr-9 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>

          {/* Icon mũi tên giả (Absolute) */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <ChevronDown size={14} strokeWidth={2.5} />
          </div>
        </div>
        {/* -------------------------------------- */}
      </div>

      {/* Phần Grid hiển thị chấm tròn (Giữ nguyên) */}
      <div className="space-y-6 w-full">
        {habits.map(habit => (
          <div key={habit.id} className="w-full">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-bold text-xs md:text-sm text-gray-800 flex items-center gap-1.5"><span className="text-base">{habit.icon || '🔥'}</span> {habit.name}</h4>
            </div>
            <div className="flex w-full gap-[1px]">
              {Array.from({ length: 12 }, (_, m) => {
                const days = getDaysInMonth(year, m);
                return (
                  <div key={m} className="flex-1 flex flex-col gap-[1px]">
                    <div className="flex flex-wrap content-start h-full gap-[1px]">
                      {Array.from({ length: days }, (_, d) => {
                        const dateKey = `${year}-${String(m + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`;
                        const isDone = (habit.history?.[dateKey] || 0) === 100;
                        return <div key={d} className={`w-[3px] h-[3px] md:w-2 md:h-2 rounded-[1px] ${isDone ? 'bg-green-500' : 'bg-slate-100'}`} title={`${dateKey}`}></div>
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Report Summary (THÊM MỚI)
const ReportSummary = ({ habits, filter, date, year }) => {
  const metrics = useMemo(() => {
    let startDate, endDate;
    const targetDate = new Date(date);

    // 1. Xác định khoảng thời gian dựa trên Filter
    if (filter === 'weekly') {
      startDate = getMonday(targetDate);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (filter === 'monthly') {
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    } else { // yearly
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }

    let totalScheduled = 0; // Tổng số "lượt" cần làm (denominator)
    let totalCompleted = 0; // Tổng số "lượt" đã làm (numerator)

    // 2. Duyệt qua từng ngày trong khoảng thời gian
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentLoopDate = new Date(d);
      const dateKey = getLocalDateKey(currentLoopDate);

      habits.forEach(habit => {
        // Chỉ tính nếu habit đó "đến hạn" vào ngày hôm đó
        if (isHabitDueOnDate(habit, currentLoopDate)) {
          totalScheduled++;
          // Check xem đã hoàn thành chưa
          if ((habit.history?.[dateKey] || 0) === 100) {
            totalCompleted++;
          }
        }
      });
    }

    const rate = totalScheduled === 0 ? 0 : Math.round((totalCompleted / totalScheduled) * 100);

    return {
      rate,
      completed: totalCompleted,
      scheduled: totalScheduled
    };
  }, [habits, filter, date, year]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
      {/* Card 1: Completion Rate (%) */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <Activity size={20} />
          <span className="text-sm font-bold uppercase">Tỷ lệ hoàn thành</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-extrabold">{metrics.rate}%</span>
          <span className="text-sm font-medium opacity-80 mb-1.5">toàn thời gian</span>
        </div>
        <div className="mt-3 w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${metrics.rate}%` }}
          />
        </div>
      </div>

      {/* Card 2: Consistency (Done / Total) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-2 text-gray-500">
          <CheckCircle2 size={20} className="text-green-500" />
          <span className="text-sm font-bold uppercase">Mức độ duy trì</span>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-gray-900">{metrics.completed}</span>
            <span className="text-gray-400 font-bold text-lg">/ {metrics.scheduled}</span>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Số lần hoàn thành trên tổng số lần cần thực hiện
          </p>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: GOAL METRICS (SCORECARD DƯỚI CÙNG) ---
const GoalMetrics = ({ goals }) => {
  const metrics = useMemo(() => {
    const total = goals.length;
    if (total === 0) return { avgProgress: 0, completed: 0, total: 0, rate: 0 };

    // 1. Số lượng hoàn thành
    const completed = goals.filter(g => {
      const p = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
      return p >= 100;
    }).length;

    // 2. Tiến độ trung bình của tất cả mục tiêu
    const totalPercent = goals.reduce((acc, g) => {
      const p = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
      return acc + p;
    }, 0);

    const avgProgress = Math.round(totalPercent / total);
    const rate = Math.round((completed / total) * 100);

    return { avgProgress, completed, total, rate };
  }, [goals]);

  if (goals.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
      {/* Card 1: Tiến độ trung bình (Giống style Báo cáo nhưng màu Indigo) */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200">
        <div className="flex items-center gap-2 mb-2 opacity-90">
          <Activity size={20} />
          <span className="text-sm font-bold uppercase">Tiến độ chung</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-extrabold">{metrics.avgProgress}%</span>
          <span className="text-sm font-medium opacity-80 mb-1.5">trung bình</span>
        </div>
        <div className="mt-3 w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${metrics.avgProgress}%` }}
          />
        </div>
      </div>

      {/* Card 2: Tỷ lệ hoàn thành (Số lượng) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-2 text-gray-500">
          <CheckCircle2 size={20} className="text-green-500" />
          <span className="text-sm font-bold uppercase">Đã đạt được</span>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-gray-900">{metrics.completed}</span>
            <span className="text-gray-400 font-bold text-lg">/ {metrics.total}</span>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Mục tiêu đã hoàn thành 100%
          </p>
        </div>
      </div>
    </div>
  );
};

// 5. Goals View (THÊM MỚI - Module Mục tiêu)
// --- COMPONENT: GOALS VIEW (CLICK BADGE ĐỂ CHỈNH LẠI) ---
const GoalsView = ({ goals, filter, setFilter, onEdit, onDelete, onUpdateValue, onAddClick, viewDate, setViewDate }) => {

  // State Modal
  const [updatingGoal, setUpdatingGoal] = useState(null);
  const [tempAmount, setTempAmount] = useState('');

  const openUpdateModal = (goal) => {
    setUpdatingGoal(goal);
    setTempAmount(goal.currentAmount);
  };

  const handleSaveUpdate = () => {
    if (updatingGoal) {
      onUpdateValue(updatingGoal, tempAmount);
      setUpdatingGoal(null);
    }
  };

  // Helper Logic
  // 1. Helper Label: Hiển thị tiêu đề ngày tháng
  const getDateLabel = () => {
    if (filter === 'all') return 'Tất cả danh sách'; // Label cho chế độ xem hết

    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + 1;
    if (filter === 'year') return `Năm ${y}`;
    if (filter === 'month') return `Tháng ${m}/${y}`;
    if (filter === 'quarter') {
      const q = Math.floor((viewDate.getMonth() + 3) / 3);
      return `Quý ${q} - Năm ${y}`;
    }
  };

  // 2. Logic Filter: Đã cập nhật để chấp nhận 'all'
  const filteredGoals = goals.filter(g => {
    if (filter === 'all') return true; // <-- QUAN TRỌNG: Nếu là 'all' thì lấy hết

    if (g.type !== filter) return false; // Lọc theo loại (tháng/quý/năm)

    const d = new Date(g.deadline);
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();

    if (filter === 'year') return d.getFullYear() === viewYear;
    if (filter === 'month') return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    if (filter === 'quarter') {
      const goalQ = Math.floor((d.getMonth() + 3) / 3);
      const viewQ = Math.floor((viewMonth + 3) / 3);
      return d.getFullYear() === viewYear && goalQ === viewQ;
    }
    return true;
  });

  const navigateTime = (direction) => {
    const newDate = new Date(viewDate);
    if (filter === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
    else if (filter === 'month') newDate.setMonth(newDate.getMonth() + direction);
    else if (filter === 'quarter') newDate.setMonth(newDate.getMonth() + (direction * 3));
    setViewDate(newDate);
  };

  const calculateProgress = (current, target) => Math.min(100, Math.round((current / target) * 100));

  return (
    <div className="animate-fade-in space-y-4">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="text-left w-full md:w-auto">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">Mục tiêu dài hạn</h2>
          <p className="text-gray-500 mt-1 text-sm">Quản lý các cột mốc quan trọng</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
          {/* MENU FILTER: Thêm nút 'Tất cả' */}
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'all', label: 'Tất cả' }, // <-- Thêm nút này
              { id: 'month', label: 'Tháng' },
              { id: 'quarter', label: 'Quý' },
              { id: 'year', label: 'Năm' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setViewDate(new Date()); }}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === f.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* NAVIGATE TIME: Chỉ hiện khi KHÔNG PHẢI là 'all' */}
          {filter !== 'all' && (
            <div className="flex items-center justify-between w-full sm:w-auto gap-2 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => navigateTime(-1)} className="p-1 hover:bg-white rounded-md shadow-sm transition-all"><ChevronLeft size={16} /></button>
              <span className="text-xs font-bold text-gray-700 min-w-[80px] text-center">{getDateLabel()}</span>
              <button onClick={() => navigateTime(1)} className="p-1 hover:bg-white rounded-md shadow-sm transition-all"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>

      {/* DANH SÁCH MỤC TIÊU (ĐÃ SỬA LỖI GIAO DIỆN MOBILE) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredGoals.length > 0 ? (
          filteredGoals.map((goal) => {
            const percent = calculateProgress(goal.currentAmount, goal.targetAmount);
            const isCompleted = percent >= 100;
            const themeColor = goal.color || '#6366F1';

            return (
              <div
                key={goal.id}
                // Thêm 'group/item' để scope hover chính xác hơn
                className="group/item relative p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                {/* 1. ICON & INFO (Bên trái) */}
                <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                  {/* Icon Box */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm"
                    style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                  >
                    {goal.icon || '🎯'}
                  </div>

                  {/* Text Info & Progress Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-gray-800 text-base truncate pr-2">{goal.name}</h3>
                    </div>

                    {/* Thanh tiến độ */}
                    <div className="w-full max-w-[200px] h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${percent}%`, backgroundColor: themeColor }}
                      />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={10} /> {new Date(goal.deadline).toLocaleDateString('vi-VN')}
                      </span>
                      {goal.description && (
                        <span className="truncate max-w-[150px] border-l border-slate-200 pl-2 font-medium">
                          {goal.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. STATS & ACTIONS (Bên phải - Chứa tất cả nút bấm) */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 pl-0 sm:pl-4 sm:border-l sm:border-slate-50 mt-2 sm:mt-0">
                  {/* Con số thống kê */}
                  <div className="text-right shrink-0">
                    {/* SỬA LẠI: Luôn dùng themeColor cho con số, bất kể đã xong hay chưa */}
                    <div
                      className="text-base font-black leading-none"
                      style={{ color: themeColor }}
                    >
                      {goal.currentAmount.toLocaleString()}
                    </div>

                    <div className="text-[10px] font-bold text-gray-400 mt-1">
                      / {goal.targetAmount.toLocaleString()} {goal.unit}
                    </div>
                  </div>

                  {/* CỤM NÚT HÀNH ĐỘNG (Đặt chung vào một khối flex) */}
                  <div className="flex items-center gap-3">

                    {/* Nút Sửa/Xóa: Mobile hiện mờ, Desktop hover mới hiện */}
                    <div className="flex items-center gap-1 opacity-60 sm:opacity-0 group-hover/item:sm:opacity-100 transition-all">
                      <button onClick={() => onEdit(goal)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => onDelete(goal.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Nút hành động chính (Cập nhật/Xong) */}
                    {!isCompleted ? (
                      <button
                        onClick={() => openUpdateModal(goal)}
                        className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 shadow-sm transition-all active:scale-95 shrink-0"
                      >
                        Cập nhật
                      </button>
                    ) : (
                      <button
                        onClick={() => openUpdateModal(goal)}
                        className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 shadow-sm hover:bg-green-100 transition-colors shrink-0"
                      >
                        <CheckCircle2 size={14} strokeWidth={3} />
                        <span className="text-[10px] font-extrabold uppercase">Xong</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* (Đã xóa phần div absolute cũ ở đây) */}
              </div>
            )
          })
        ) : (
          /* EMPTY STATE (Giữ nguyên) */
          <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
              <Target size={32} />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Chưa có mục tiêu nào phù hợp.</p>
              <button onClick={onAddClick} className="mt-2 text-indigo-600 font-bold text-sm hover:underline">
                + Thêm mục tiêu mới ngay
              </button>
            </div>
          </div>
        )}
      </div>

      <GoalMetrics goals={filteredGoals} />

      {/* --- MODAL CẬP NHẬT --- */}
      {updatingGoal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setUpdatingGoal(null)}></div>

          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Cập nhật tiến độ</h3>
                <p className="text-xs text-gray-400 mt-1">{updatingGoal.name}</p>
              </div>
              <button onClick={() => setUpdatingGoal(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="flex flex-col items-center gap-6 mb-6">
              <div className="flex items-center justify-center gap-4 w-full">
                {/* Nút Trừ */}
                <button
                  onClick={() => setTempAmount(Math.max(0, Number(tempAmount) - 1))}
                  className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-600 font-bold text-2xl active:scale-95 transition-all shadow-sm"
                >
                  -
                </button>

                {/* Input */}
                <div className="flex flex-col items-center">
                  <div className="flex items-baseline gap-1.5 border-b-2 border-indigo-100 px-2 pb-1 focus-within:border-indigo-500 transition-colors">
                    <input
                      type="number"
                      className="w-24 text-4xl font-black text-center text-gray-800 outline-none bg-transparent p-0"
                      value={tempAmount}
                      onChange={(e) => setTempAmount(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                    />
                    <span className="text-sm font-bold text-gray-400 whitespace-nowrap">
                      / {updatingGoal.targetAmount} {updatingGoal.unit}
                    </span>
                  </div>
                </div>

                {/* Nút Cộng */}
                <button
                  onClick={() => setTempAmount(Number(tempAmount) + 1)}
                  className="w-14 h-14 flex items-center justify-center rounded-2xl text-white font-bold text-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                  style={{ backgroundColor: updatingGoal.color || '#4f46e5' }}
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveUpdate}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black active:scale-[0.98] transition-all shadow-lg"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}


    </div>
  );
};

// --- MAIN APP ---
export default function HabitApp({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [trackerFilter, setTrackerFilter] = useState('weekly');
  const [habits, setHabits] = useState([]);

  // 1. GỌI HOOK TRIAL
  const { isReadOnly, daysLeft, isPremium, createdAt, expirationDate } = useTrial(user);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 2. CHECK PERMISSION
  const checkPermission = () => {
    if (isReadOnly) {
      setShowTrialModal(true);
      return false;
    }
    return true;
  };

  const handleUpgrade = () => {
    navigate('/pricing');
    setShowTrialModal(false);
  };

  // State cho Goals
  const [goals, setGoals] = useState([]);
  const [goalFilter, setGoalFilter] = useState('all'); // year | quarter | month
  const [goalViewDate, setGoalViewDate] = useState(new Date());

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [modalType, setModalType] = useState('habit'); // 'habit' | 'goal'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [editingHabitId, setEditingHabitId] = useState(null);

  const [formData, setFormData] = useState({
    name: '', icon: '🎯', description: '', color: '', time: '',
    goalAmount: '1', goalUnit: 'lần', freqType: 'daily', freqValue: [],
    startDate: '', endDate: ''
  });

  const [goalFormData, setGoalFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    currentAmount: '0',
    unit: 'lần', // Mặc định theo list
    deadline: '',
    type: 'year',
    icon: '🎯', // Thêm mặc định
    color: getRandomColor() // Thêm màu mặc định
  });

  // Helper: Tính toán deadline dựa trên inputs
  const getDeadlineDate = (type, year, value) => {
    let date;
    if (type === 'year') {
      date = new Date(year, 11, 31); // 31/12
    } else if (type === 'quarter') {
      // Quý 1 (tháng 3), Quý 2 (tháng 6), Quý 3 (tháng 9), Quý 4 (tháng 12)
      // new Date(y, m, 0) trả về ngày cuối cùng của tháng trước đó -> nên dùng m*3
      const endMonth = value * 3;
      date = new Date(year, endMonth, 0);
    } else { // month
      date = new Date(year, value, 0); // value là tháng 1-12. new Date(2025, 1, 0) -> 31/1/2025
    }

    // Format YYYY-MM-DD để gán vào state deadline
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // DATA FETCHING HABITS
  useEffect(() => {
    if (!user) return;
    const base = getBasePath(user);
    const unsubscribe = onSnapshot(collection(db, `${base}/habits`), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHabits(data);
    });
    return () => unsubscribe();
  }, [user]);

  // DATA FETCHING GOALS (NEW)
  useEffect(() => {
    if (!user) return;
    const base = getBasePath(user);
    const unsubscribe = onSnapshot(collection(db, `${base}/goals`), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      setGoals(data);
    });
    return () => unsubscribe();
  }, [user]);

  // --- HANDLERS FOR HABITS ---
  const handleSaveHabit = async (e) => {
    e.preventDefault();
    if (!checkPermission()) return;
    if (!formData.name.trim()) return;

    let finalFreqValue = formData.freqValue;
    if (formData.freqType === 'times_per_week' || formData.freqType === 'times_per_month') {
      finalFreqValue = parseInt(finalFreqValue) || 1;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description,
      icon: formData.icon,
      time: formData.time,
      color: formData.color || getRandomColor(),
      goalAmount: parseInt(formData.goalAmount) || 1,
      goalUnit: formData.goalUnit || 'lần',
      freqType: formData.freqType,
      freqValue: finalFreqValue,
      // --- THÊM MỚI ---
      startDate: formData.startDate || null, // Lưu null nếu rỗng
      endDate: formData.endDate || null      // Lưu null nếu rỗng
    };

    const base = getBasePath(user);
    if (editingHabitId) {
      await updateDoc(doc(db, `${base}/habits`, editingHabitId), payload);
    } else {
      await addDoc(collection(db, `${base}/habits`), {
        ...payload,
        history: {},
        createdAt: serverTimestamp()
      });
    }
    closeModal();
  };

  // --- CẬP NHẬT HÀM LƯU MỤC TIÊU ---
  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!checkPermission()) return;
    const base = getBasePath(user);

    // 1. Xử lý Deadline mặc định nếu người dùng không chọn
    let finalDeadline = goalFormData.deadline;

    if (!finalDeadline) {
      // Nếu chưa có deadline, tự tính toán dựa trên thời gian hiện tại
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentQuarter = Math.ceil(currentMonth / 3);

      // Sử dụng hàm helper getDeadlineDate bạn đã có
      if (goalFormData.type === 'year') {
        finalDeadline = getDeadlineDate('year', currentYear, null);
      } else if (goalFormData.type === 'quarter') {
        finalDeadline = getDeadlineDate('quarter', currentYear, currentQuarter);
      } else { // month
        finalDeadline = getDeadlineDate('month', currentYear, currentMonth);
      }
    }

    // 2. Tạo payload chuẩn
    const payload = {
      ...goalFormData,
      targetAmount: Number(goalFormData.targetAmount),
      currentAmount: Number(goalFormData.currentAmount),
      deadline: finalDeadline, // Sử dụng deadline đã validate
      icon: goalFormData.icon || '🎯',
      color: goalFormData.color || getRandomColor(),
      description: goalFormData.description || '',
      createdAt: serverTimestamp()
    };

    // 3. Gửi lên Firebase
    if (editingHabitId) {
      await updateDoc(doc(db, `${base}/goals`, editingHabitId), payload);
    } else {
      await addDoc(collection(db, `${base}/goals`), payload);
    }
    closeModal();
  };

  const deleteGoal = async (id) => {
    if (!checkPermission()) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa mục tiêu này không?\nHành động này không thể hoàn tác.")) {
      const base = getBasePath(user);
      await deleteDoc(doc(db, `${base}/goals`, id));
    }
  };

  const updateGoalProgress = async (goal, amount) => {
    if (!checkPermission()) return;
    const base = getBasePath(user);
    const newAmount = Math.max(0, (goal.currentAmount || 0) + amount);
    await updateDoc(doc(db, `${base}/goals`, goal.id), { currentAmount: newAmount });
  };

  // Hàm cập nhật giá trị chính xác (dùng cho nhập số trực tiếp)
  const updateGoalValue = async (goal, newValue) => {
    if (!checkPermission()) return;
    const base = getBasePath(user);
    // Đảm bảo không nhỏ hơn 0
    const finalValue = Math.max(0, Number(newValue));
    await updateDoc(doc(db, `${base}/goals`, goal.id), { currentAmount: finalValue });
  };

  // --- COMMON HANDLERS ---
  const closeModal = () => {
    // Reset thêm startDate và endDate về rỗng
    setFormData({
      name: '', icon: '🎯', description: '', color: '', time: '',
      goalAmount: '1', goalUnit: 'lần', freqType: 'daily', freqValue: [],
      startDate: '', endDate: ''
    });
    setGoalFormData({ name: '', description: '', targetAmount: '', currentAmount: '0', unit: '', deadline: '', type: 'year' });
    setEditingHabitId(null);
    setShowModal(false);
    setShowEmojiPicker(false);
  };

  // --- HÀM MỞ MODAL CHỈNH SỬA THÓI QUEN ---
  const openEditModal = (habit) => {
    if (!checkPermission()) return;
    setEditingHabitId(habit.id);
    setFormData({
      name: habit.name,
      icon: habit.icon || '🎯',
      description: habit.description || '',
      color: habit.color || getRandomColor(),
      time: habit.time || '',
      goalAmount: habit.goalAmount || '1',
      goalUnit: habit.goalUnit || 'lần',
      freqType: habit.freqType || 'daily',
      freqValue: habit.freqValue || [],
      // --- THÊM MỚI ---
      startDate: habit.startDate || '',
      endDate: habit.endDate || ''
    });
    setModalType('habit');
    setShowModal(true);
  };



  const deleteHabit = async (id) => {
    if (!checkPermission()) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa thói quen này không?\nDữ liệu lịch sử cũng sẽ bị xóa và không thể khôi phục.")) {
      await deleteDoc(doc(db, getHabitPath(user), id));
    }
  };

  // Toggle Check: Chỉ update history
  const toggleCheck = async (habit) => {
    if (!checkPermission()) return;
    const dateKey = getLocalDateKey(currentDate);
    const currentVal = habit.history?.[dateKey] || 0;
    const newVal = currentVal === 100 ? 0 : 100;

    const base = getBasePath(user);
    await updateDoc(doc(db, `${base}/habits`, habit.id), {
      [`history.${dateKey}`]: newVal
    });
  };

  const handleLogout = async () => {
    if (confirm("Bạn có chắc muốn đăng xuất?")) await signOut(auth);
  };

  const goToday = () => setCurrentDate(new Date());

  const SidebarItem = ({ id, label, icon: Icon, active, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium active:bg-gray-200 active:scale-[0.98] ${active ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 sm:hover:bg-gray-100 sm:hover:text-gray-900'}`}>
      <Icon size={20} className={active ? 'text-white' : 'text-gray-400'} /> {label}
    </button>
  );

  const userName = user.isAnonymous ? 'Demo User' : (user.displayName || user.email?.split('@')[0]);
  const userInitial = userName.charAt(0).toUpperCase();
  const dateKey = getLocalDateKey(currentDate);

  return (
    <div className="fixed inset-0 bg-slate-50 text-gray-800 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-pink-100 selection:text-pink-900">

      {/* MOBILE HEADER */}
      <div className="flex-none md:hidden bg-white px-5 py-4 flex justify-between items-center z-40 border-b border-gray-100 shadow-sm">
        <h1 className="font-bold text-lg text-gray-900">{userName}</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg text-gray-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      {/* --- SIDEBAR (STYLE ĐƠN GIẢN GIỐNG FINANCE) --- */}
      <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 md:translate-x-0 md:static ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl md:shadow-none`}>

        {/* 1. Header User Info */}
        <div className="p-8 border-b border-slate-50 flex-none">
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-xl transition-colors"
            onClick={() => setIsProfileOpen(true)}
          >
            <div className="relative">
              <div className={`
                  w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-blue-200 shadow-lg
                  ${isPremium ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
                `}>
                {userInitial}
              </div>
              {isPremium && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 p-0.5 rounded-full shadow-md border-2 border-white transform rotate-12">
                  <Crown size={12} fill="currentColor" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-gray-900 tracking-tight leading-none">{userName}</h1>
              <p className="text-xs text-gray-400 font-medium mt-1">
                {isPremium ? 'Premium Habit Tracker' : 'Habit Tracker'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Nav Items */}
        <nav className="p-6 space-y-2 flex-1 overflow-y-auto">
          {/* NHÓM CHÍNH: Thói quen, Báo cáo & Cài đặt */}
          <SidebarItem id="overview" label="Thói quen" icon={LayoutDashboard} active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} />
          <SidebarItem id="tracker" label="Báo cáo" icon={BarChart2} active={activeTab === 'tracker'} onClick={() => { setActiveTab('tracker'); setIsMobileMenuOpen(false); }} />
          <SidebarItem id="settings" label="Cài đặt" icon={Settings} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} />

          {/* LINE NGĂN CÁCH */}
          <div className="pt-4 border-t border-slate-50 mt-4">
            {/* NHÓM TÁCH BIỆT: Mục tiêu dài hạn */}
            <SidebarItem id="goals" label="Mục tiêu dài hạn" icon={Target} active={activeTab === 'goals'} onClick={() => { setActiveTab('goals'); setIsMobileMenuOpen(false); }} />
          </div>
        </nav>

        {/* 3. Bottom Actions */}
        <div className="p-6 space-y-2 flex-none border-t border-slate-50">
          <button onClick={() => navigate('/')} className="w-full bg-white hover:bg-slate-50 text-slate-600 p-4 rounded-2xl flex items-center gap-3 transition-colors font-medium border border-slate-100 active:scale-[0.98]">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><ArrowLeft size={16} /></div> Quay lại Menu
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
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

        <header className="bg-white/80 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 sticky top-0 z-30 border-b border-slate-200/50 min-h-[auto] sm:min-h-[72px] flex items-center">
          <div className="w-full flex justify-end">
            <button
              onClick={() => {
                if (!checkPermission()) return;
                closeModal();
                setModalType(activeTab === 'goals' ? 'goal' : 'habit');
                setShowModal(true);
              }}
              // Mobile: w-full (full chiều rộng), py-3 (cao hơn). Desktop: w-auto (tự co), py-2.5
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-900 text-white py-3.5 md:px-6 md:py-2.5 rounded-xl shadow-lg transition-all active:scale-[0.98] font-bold text-sm"
            >
              <PlusCircle size={20} />
              {/* Luôn hiện text, không ẩn trên mobile nữa */}
              <span>
                {activeTab === 'goals' ? 'Thêm mục tiêu mới' : 'Thêm thói quen mới'}
              </span>
            </button>
          </div>
        </header>


        <div className="p-4 sm:p-8 max-w-[1200px] mx-auto pb-32">

          {/* TAB: TỔNG QUAN */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex flex-row justify-between items-end gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {currentDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    <span className="text-gray-400 font-normal ml-1 hidden sm:inline">- Năm {currentDate.getFullYear()}</span>
                  </h2>
                  <p className="text-gray-500 mt-1">Danh sách công việc hôm nay</p>
                </div>
                <button onClick={goToday} className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-xl text-blue-600 shadow-sm hover:bg-blue-50 transition-colors active:scale-95">
                  <RotateCcw size={18} />
                </button>
              </div>

              <DateCarousel selectedDate={currentDate} onSelectDate={setCurrentDate} habits={habits} />

              {/* TASK LIST */}
              <div className="mt-6 space-y-3">
                {habits
                  .filter(h => isHabitDueOnDate(h, currentDate))
                  .map(habit => {
                    const val = habit.history?.[dateKey] || 0;
                    const isDone = val === 100;
                    const themeColor = habit.color || '#3B82F6';

                    return (
                      <div
                        key={habit.id}
                        className="bg-white p-4 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center gap-4 relative overflow-hidden group"
                      >
                        {/* Color Bar Accent */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 transition-opacity" style={{ backgroundColor: themeColor, opacity: 0.5 }}></div>

                        {/* ICON BOX */}
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                          style={{ backgroundColor: `${themeColor}15` }}>
                          {habit.icon || '📌'}
                        </div>

                        {/* TEXT CONTENT */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-lg leading-tight mb-1 truncate">{habit.name}</h4>
                          <div className="flex items-center gap-2 truncate">
                            <span className="px-2 py-1 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: `${themeColor}20`, color: themeColor }}>
                              {isDone ? `${habit.goalAmount}/${habit.goalAmount}` : `0/${habit.goalAmount}`} {habit.goalUnit}
                            </span>
                            <span className="text-xs text-gray-500 font-medium truncate flex items-center gap-1">
                              {habit.time ? <span>{formatTime(habit.time)}</span> : ''}
                              {habit.description && <span className="text-gray-400 truncate">({habit.description})</span>}
                            </span>
                          </div>
                        </div>

                        {/* RIGHT ACTION */}
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => toggleCheck(habit)}
                            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all active:scale-90
                                    ${isDone ? 'border-transparent text-white shadow-md bg-green-500' : 'border-slate-200 text-slate-200 hover:border-blue-300 hover:text-blue-300 bg-white'}
                                  `}
                            style={isDone ? { boxShadow: `0 4px 10px ${themeColor}40` } : {}}
                          >
                            <Check size={24} strokeWidth={4} />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                {habits.filter(h => isHabitDueOnDate(h, currentDate)).length === 0 && (
                  <div className="text-center py-12 text-gray-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <p>Hôm nay không có thói quen nào cần làm!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: BÁO CÁO */}
          {activeTab === 'tracker' && (
            <div className="animate-fade-in space-y-6">
              {/* --- HEADER BÁO CÁO (ĐÃ CĂN TRÁI & ĐỒNG BỘ MÀU) --- */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-800">Lịch sử thực hiện</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {trackerFilter === 'yearly' ? `Năm ${reportYear}` : 'Theo dõi tiến độ & Hiệu suất'}
                  </p>
                </div>

                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-full md:w-auto">
                  {[
                    { id: 'weekly', label: 'Tuần' },
                    { id: 'monthly', label: 'Tháng' },
                    { id: 'yearly', label: 'Năm' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setTrackerFilter(f.id)}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${trackerFilter === f.id
                        ? 'bg-indigo-600 text-white shadow-md' // Đổi từ pink-500 sang indigo-600
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* REPORT SUMMARY (New) */}
              <ReportSummary
                habits={habits}
                filter={trackerFilter}
                date={currentDate}
                year={reportYear}
              />

              {trackerFilter === 'weekly' && <WeeklyView habits={habits} currentDate={currentDate} navigateDate={(amt) => { const d = new Date(currentDate); d.setDate(d.getDate() + amt); setCurrentDate(d); }} />}
              {trackerFilter === 'monthly' && <MonthlyView habits={habits} currentDate={currentDate} navigateDate={(amt) => { const d = new Date(currentDate); d.setDate(d.getDate() + amt); setCurrentDate(d); }} />}
              {trackerFilter === 'yearly' && <YearlyView habits={habits} year={reportYear} setYear={setReportYear} />}
            </div>
          )}

          {/* TAB: MỤC TIÊU (GOALS) - NEW */}
          {activeTab === 'goals' && (
            <GoalsView
              goals={goals}
              filter={goalFilter}
              setFilter={setGoalFilter}
              viewDate={goalViewDate}
              setViewDate={setGoalViewDate}
              onEdit={(goal) => {
                setEditingHabitId(goal.id);
                setGoalFormData(goal);
                setModalType('goal');
                setShowModal(true);
              }}
              onDelete={deleteGoal}
              onUpdateValue={updateGoalValue}
              onAddClick={() => {
                if (!checkPermission()) return;
                setModalType('goal');
                setShowModal(true);
              }}
            />
          )}

          {/* TAB: CÀI ĐẶT - QUẢN LÝ THÓI QUEN (ĐÃ FIX LAYOUT CỨNG) */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in space-y-6">
              <div><h2 className="text-2xl font-bold text-gray-800">Quản lý thói quen</h2></div>
              <div className="grid gap-3">
                {habits.map(habit => (
                  <div key={habit.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 h-[88px] overflow-hidden w-full max-w-full">

                    {/* 1. ICON (Cố định cứng - shrink-0) */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: `${habit.color}15` }}
                    >
                      {habit.icon}
                    </div>

                    {/* 2. TEXT CONTAINER (Scroll ngang tại đây) */}
                    {/* w-0 flex-1: Ép container co lại vừa khít khoảng trống, ngăn tràn viền cha */}
                    <div className="flex-1 w-0 flex flex-col justify-center">
                      <div
                        className="overflow-x-auto whitespace-nowrap pr-4"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Ẩn thanh cuộn cho đẹp
                      >
                        {/* Tên Thói Quen */}
                        <h4 className="font-bold text-gray-800 text-base leading-tight mb-1 inline-block">
                          {habit.name}
                        </h4>

                        {/* Tags Info */}
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          <span className="font-bold text-gray-600 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                            {habit.goalAmount} {habit.goalUnit}
                          </span>
                          <span className="font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase whitespace-nowrap shrink-0">
                            {FREQUENCY_TYPES.find(f => f.value === habit.freqType)?.label || 'Hàng ngày'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. BUTTONS (Cố định cứng bên phải - shrink-0) */}
                    <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-slate-50 h-10 bg-white">
                      <button
                        onClick={() => openEditModal(habit)}
                        className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL EDIT/CREATE (FIXED: Overflow & Layout) --- */}
      {showModal && (
        <div className="relative z-[70]">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          />

          {/* Scroll Container */}
          <div className="fixed inset-0 z-10 overflow-y-auto">
            {/* Layout Wrapper */}
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">

              {/* Panel */}
              <div
                className="relative transform bg-white rounded-3xl text-left shadow-xl transition-all sm:my-8 w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                  <h3 className="font-bold text-xl text-gray-800">
                    {editingHabitId ? 'Chỉnh sửa' : 'Tạo mới'} {modalType === 'goal' ? 'mục tiêu' : 'thói quen'}
                  </h3>
                  <button onClick={closeModal} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>

                {/* SWITCH FORM BODY BASED ON MODAL TYPE */}
                {modalType === 'habit' ? (
                  /* --- FORM HABIT --- */
                  <form onSubmit={handleSaveHabit} className="p-6 space-y-5">

                    {/* 1. TÊN */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tên thói quen</label>
                      <input
                        required
                        type="text"
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold placeholder:font-normal"
                        placeholder="VD: Đọc sách, Tập Gym..."
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />

                    </div>


                    {/* 2. MỤC TIÊU */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mục tiêu hàng ngày</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          className="w-1/3 p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-center"
                          value={formData.goalAmount}
                          onChange={e => setFormData({ ...formData, goalAmount: e.target.value })}
                        />
                        {/* --- SỬA DROPDOWN CHO IOS --- */}
                        <div className="relative w-2/3">
                          <select
                            className="w-full h-full p-3 pr-10 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold bg-white appearance-none"
                            value={formData.goalUnit}
                            onChange={e => setFormData({ ...formData, goalUnit: e.target.value })}
                          >
                            {GOAL_UNITS.map(u => <option key={u.value} value={u.value}>{u.label} ({u.value})</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                        {/* --------------------------- */}
                      </div>
                    </div>

                    {/* 3. TẦN SUẤT */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Filter size={12} /> Tần suất lặp lại</label>
                      <div className="relative mb-3">
                        <select
                          className="w-full p-3 pr-10 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold bg-white appearance-none"
                          value={formData.freqType}
                          onChange={e => setFormData({ ...formData, freqType: e.target.value, freqValue: [] })}
                        >
                          {FREQUENCY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <ChevronDown size={16} />
                        </div>
                      </div>

                      {formData.freqType === 'specific_days' && (
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map(day => {
                            const isSelected = Array.isArray(formData.freqValue) && formData.freqValue.includes(day.key);
                            return (
                              <button
                                type="button" key={day.key}
                                onClick={() => {
                                  const current = Array.isArray(formData.freqValue) ? formData.freqValue : [];
                                  const newData = isSelected ? current.filter(k => k !== day.key) : [...current, day.key];
                                  setFormData({ ...formData, freqValue: newData });
                                }}
                                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-gray-500'}`}
                              >
                                {day.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {formData.freqType === 'times_per_week' && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-600">Làm</span>
                          <input type="number" min="1" max="7" className="w-20 p-2 text-center border rounded-lg font-bold" value={formData.freqValue} onChange={e => setFormData({ ...formData, freqValue: e.target.value })} />
                          <span className="text-sm font-medium text-gray-600">ngày / tuần</span>
                        </div>
                      )}
                      {formData.freqType === 'specific_dates' && (
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                            const isSelected = Array.isArray(formData.freqValue) && formData.freqValue.includes(d);
                            return (
                              <button
                                type="button" key={d}
                                onClick={() => {
                                  const current = Array.isArray(formData.freqValue) ? formData.freqValue : [];
                                  const newData = isSelected ? current.filter(k => k !== d) : [...current, d];
                                  setFormData({ ...formData, freqValue: newData });
                                }}
                                className={`h-8 rounded text-xs font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-gray-400'}`}
                              >{d}</button>
                            )
                          })}
                        </div>
                      )}
                      {formData.freqType === 'times_per_month' && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-600">Làm</span>
                          <input type="number" min="1" max="30" className="w-20 p-2 text-center border rounded-lg font-bold" value={formData.freqValue} onChange={e => setFormData({ ...formData, freqValue: e.target.value })} />
                          <span className="text-sm font-medium text-gray-600">ngày / tháng</span>
                        </div>
                      )}
                    </div>

                    {/* --- 1. KHỐI NGÀY BẮT ĐẦU / KẾT THÚC (ĐÃ FIX TRÀN VIỀN IOS + NGẮN GỌN) --- */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                        <CalendarDays size={12} /> Thời gian áp dụng (Tùy chọn)
                      </label>

                      <div className="flex gap-4">
                        {/* Cột Ngày bắt đầu: Dùng flex-1 + min-w-0 để chống tràn trên iOS */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Ngày bắt đầu</span>
                          <input
                            type="date"
                            // max-w-[150px]: Giới hạn độ rộng tối đa để input không bị quá dài
                            className="w-full max-w-[150px] p-2.5 border border-slate-200 rounded-lg font-bold bg-white text-sm outline-none focus:border-blue-500 shadow-sm appearance-none"
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                          />
                        </div>

                        {/* Cột Ngày kết thúc: Tương tự */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Ngày kết thúc</span>
                          <input
                            type="date"
                            className="w-full max-w-[150px] p-2.5 border border-slate-200 rounded-lg font-bold bg-white text-sm outline-none focus:border-blue-500 shadow-sm appearance-none"
                            value={formData.endDate}
                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 font-medium italic">
                        * Để trống nếu muốn áp dụng thói quen này vô thời hạn.
                      </p>
                    </div>

                    {/* 2. CHỌN MÀU SẮC (Giữ nguyên) */}
                    <div className="mt-5">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Màu đại diện</label>
                      <div className="flex flex-wrap gap-3">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: color })}
                            className={`w-8 h-8 rounded-full transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* --- 3. KHỐI ICON & GIỜ NHẮC (ĐÃ CĂN LẠI WIDTH) --- */}
                    <div className="mt-5 flex items-end gap-4">
                      {/* Nút Icon: Giữ nguyên size vuông */}
                      <div className="shrink-0 relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Icon</label>
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="h-[52px] w-[52px] border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold flex items-center justify-center hover:bg-slate-50 transition-colors bg-white shadow-sm"
                        >
                          <span className="text-2xl">{formData.icon || '🎯'}</span>
                        </button>

                        {showEmojiPicker && (
                          /* ... (Phần Popup Emoji giữ nguyên) ... */
                          <div className="absolute z-50 mt-2 bottom-full left-0 mb-2 shadow-2xl rounded-2xl">
                            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
                            <div className="relative z-50">
                              <EmojiPicker
                                onEmojiClick={(e) => {
                                  setFormData({ ...formData, icon: e.emoji });
                                  setShowEmojiPicker(false);
                                }}
                                width={300}
                                height={350}
                                previewConfig={{ showPreview: false }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input Giờ: 
                              - min-w-0: Fix lỗi flex tràn trên iOS
                              - max-w-[150px]: Giới hạn độ rộng để khớp với input ngày ở trên 
                          */}
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Giờ bắt đầu</label>
                        <input
                          type="time"
                          className="h-[52px] w-full max-w-[150px] px-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold bg-white text-gray-800 shadow-sm appearance-none"
                          value={formData.time}
                          onChange={e => setFormData({ ...formData, time: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 6. MÔ TẢ */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mô tả thêm</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-gray-600"
                        placeholder="VD: Không dùng điện thoại..."
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="pt-2 sticky bottom-0 bg-white z-10">
                      <button type="submit" className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black shadow-lg shadow-gray-200 active:scale-[0.98] transition-all">
                        {editingHabitId ? 'Lưu thay đổi' : 'Tạo thói quen'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* --- FORM GOAL (ĐÃ CẬP NHẬT FULL TÍNH NĂNG) --- */
                  <form onSubmit={handleSaveGoal} className="p-6 space-y-5">

                    {/* 1. Tên mục tiêu */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tên mục tiêu</label>
                      <input required type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
                        placeholder="VD: Tiết kiệm 100tr, Đọc 50 sách..."
                        value={goalFormData.name} onChange={e => setGoalFormData({ ...goalFormData, name: e.target.value })}
                      />
                    </div>
                    {/* 2. Deadline */}
                    {/* --- BẮT ĐẦU ĐOẠN CODE THAY THẾ (LOẠI & THỜI GIAN) --- */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                          <CalendarDays size={14} /> Thời gian thực hiện
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 1. CHỌN LOẠI MỤC TIÊU */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Loại mục tiêu</label>
                          <div className="relative">
                            <select
                              className="w-full p-2.5 pr-8 border border-slate-200 rounded-lg font-bold bg-white outline-none focus:border-indigo-500 text-sm appearance-none"
                              value={goalFormData.type}
                              onChange={e => {
                                const newType = e.target.value;
                                const curDate = new Date();
                                const newDeadline = getDeadlineDate(newType, curDate.getFullYear(), newType === 'quarter' ? Math.ceil((curDate.getMonth() + 1) / 3) : curDate.getMonth() + 1);
                                setGoalFormData({ ...goalFormData, type: newType, deadline: newDeadline });
                              }}
                            >
                              <option value="month">Theo Tháng</option>
                              <option value="quarter">Theo Quý</option>
                              <option value="year">Theo Năm</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>

                        {/* 2. CHỌN THỜI GIAN (DYNAMIC INPUT) */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Chọn thời điểm</label>

                          {/* Logic render input dựa trên Type */}
                          <div className="flex gap-2">
                            {(() => {
                              // Parse ngày hiện tại từ state deadline (hoặc lấy ngày nay nếu chưa có)
                              const currentDead = goalFormData.deadline ? new Date(goalFormData.deadline) : new Date();
                              const curYear = currentDead.getFullYear();
                              const curMonth = currentDead.getMonth() + 1;
                              const curQuarter = Math.ceil(curMonth / 3);

                              // Render YEAR Select (Luôn hiển thị)
                              const YearSelect = (
                                <div className="relative w-full">
                                  <select
                                    className="w-full p-2.5 pr-8 border border-slate-200 rounded-lg font-bold bg-white outline-none focus:border-indigo-500 text-sm appearance-none"
                                    value={curYear}
                                    onChange={(e) => {
                                      const y = parseInt(e.target.value);
                                      const val = goalFormData.type === 'quarter' ? curQuarter : curMonth;
                                      setGoalFormData({ ...goalFormData, deadline: getDeadlineDate(goalFormData.type, y, val) });
                                    }}
                                  >
                                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
                                  </select>
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ChevronDown size={14} />
                                  </div>
                                </div>
                              );

                              if (goalFormData.type === 'year') {
                                return YearSelect;
                              }

                              if (goalFormData.type === 'quarter') {
                                return (
                                  <>
                                    <div className="relative w-full">
                                      <select
                                        className="w-full p-2.5 pr-8 border border-slate-200 rounded-lg font-bold bg-white outline-none focus:border-indigo-500 text-sm appearance-none"
                                        value={curQuarter}
                                        onChange={(e) => {
                                          const q = parseInt(e.target.value);
                                          setGoalFormData({ ...goalFormData, deadline: getDeadlineDate('quarter', curYear, q) });
                                        }}
                                      >
                                        {[1, 2, 3, 4].map(q => <option key={q} value={q}>Quý {q}</option>)}
                                      </select>
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={14} />
                                      </div>
                                    </div>
                                    {YearSelect}
                                  </>
                                );
                              }

                              if (goalFormData.type === 'month') {
                                return (
                                  <>
                                    <div className="relative w-full">
                                      <select
                                        className="w-full p-2.5 pr-8 border border-slate-200 rounded-lg font-bold bg-white outline-none focus:border-indigo-500 text-sm appearance-none"
                                        value={curMonth}
                                        onChange={(e) => {
                                          const m = parseInt(e.target.value);
                                          setGoalFormData({ ...goalFormData, deadline: getDeadlineDate('month', curYear, m) });
                                        }}
                                      >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                                      </select>
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={14} />
                                      </div>
                                    </div>
                                    {YearSelect}
                                  </>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* --- KẾT THÚC ĐOẠN CODE THAY THẾ --- */}

                    {/* 3. Chỉ số đo lường (Đã update Select Unit) */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Con số mục tiêu</label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Hiện tại</span>
                          <input type="number" className="w-full p-2 border border-slate-200 rounded-lg font-bold text-center"
                            value={goalFormData.currentAmount} onChange={e => setGoalFormData({ ...goalFormData, currentAmount: e.target.value })}
                          />
                        </div>
                        <span className="font-bold text-gray-300">/</span>
                        <div className="flex-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Đích đến</span>
                          <input type="number" required className="w-full p-2 border border-slate-200 rounded-lg font-bold text-center"
                            value={goalFormData.targetAmount} onChange={e => setGoalFormData({ ...goalFormData, targetAmount: e.target.value })}
                          />
                        </div>
                        <div className="w-24">
                          <span className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Đơn vị</span>
                          <div className="relative">
                            <select
                              className="w-full p-2 pr-6 border border-slate-200 rounded-lg font-bold text-center bg-white outline-none focus:border-indigo-500 appearance-none text-sm"
                              value={goalFormData.unit}
                              onChange={e => setGoalFormData({ ...goalFormData, unit: e.target.value })}
                            >
                              {GOAL_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                              <option value="đ">VND</option>
                              <option value="$">USD</option>
                            </select>
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              <ChevronDown size={12} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. CHỌN MÀU SẮC (MỚI CHO GOAL) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Màu đại diện</label>
                      <div className="flex flex-wrap gap-3">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setGoalFormData({ ...goalFormData, color: color })}
                            className={`w-8 h-8 rounded-full transition-all ${goalFormData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 5. CHỌN ICON (MỚI CHO GOAL) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Icon minh họa</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="h-[52px] w-full px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-left flex items-center gap-2 hover:bg-slate-50 transition-colors bg-white overflow-hidden"
                        >
                          <span className="text-2xl flex-shrink-0">{goalFormData.icon || '🎯'}</span>
                          <span className="text-gray-400 text-sm font-normal truncate">
                            {goalFormData.icon ? 'Đổi Icon' : 'Chọn Icon đại diện'}
                          </span>
                        </button>

                        {showEmojiPicker && (
                          <div className="absolute z-50 mt-2 bottom-full left-0 mb-2 shadow-2xl rounded-2xl">
                            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
                            <div className="relative z-50">
                              <EmojiPicker
                                onEmojiClick={(e) => {
                                  setGoalFormData({ ...goalFormData, icon: e.emoji });
                                  setShowEmojiPicker(false);
                                }}
                                width={300}
                                height={350}
                                previewConfig={{ showPreview: false }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 6. MÔ TẢ THÊM (MỚI CHO GOAL) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mô tả chi tiết</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-gray-600"
                        placeholder="VD: Để dành tiền mua Macbook..."
                        value={goalFormData.description}
                        onChange={e => setGoalFormData({ ...goalFormData, description: e.target.value })}
                      />
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all">
                      {editingHabitId ? 'Cập nhật mục tiêu' : 'Thiết lập mục tiêu'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        isPremium={isPremium}
        createdAt={createdAt}
        expirationDate={expirationDate}
      />
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        isPremium={isPremium}
        createdAt={createdAt}
        expirationDate={expirationDate}
      />
      <TrialLimitModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}