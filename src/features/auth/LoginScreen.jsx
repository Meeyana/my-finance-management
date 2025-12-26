import { useState } from 'react';
import { Wallet, AlertCircle, User, Lock, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  // signInAnonymously, // Không dùng nữa
  // signInWithCustomToken // Không dùng nữa
} from 'firebase/auth';

// 1. IMPORT QUAN TRỌNG
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'; 
import { auth, db } from '../../lib/firebase'; 

// --- CẤU HÌNH TÀI KHOẢN DEMO CỐ ĐỊNH ---
// Bạn có thể đưa vào .env nếu muốn bảo mật hơn, nhưng với demo public thì để đây cũng được
const DEMO_CREDENTIALS = {
  email: 'demo@quanlychitieu.com', // Thay bằng email bạn đã tạo ở Bước 1
  password: 'demo@quanlychitieu.com'            // Thay bằng password bạn đã tạo ở Bước 1
};

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- HÀM TẠO PROFILE (GIỮ NGUYÊN) ---
  const createUserProfile = async (user) => {
    console.log(">>> [DEBUG] 1. Bắt đầu kiểm tra profile cho UID:", user.uid);
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists() || !userSnap.data().createdAt) {
          console.log(">>> [DEBUG] 3. Document chưa có. Đang ghi...");
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email || 'demo_user',
            createdAt: serverTimestamp(),
            isPremium: false,
            isDemoAccount: true // Đánh dấu đây là tk demo nếu cần logic riêng sau này
          }, { merge: true });
          console.log(">>> [DEBUG] 4. Đã ghi thành công!");
      } else {
          console.log(">>> [DEBUG] 3. Document đã có. Bỏ qua.");
      }
    } catch (error) {
      console.error(">>> [DEBUG] LỖI GHI DB:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log(">>> [DEBUG] Auth thành công:", userCredential.user.email);
      await createUserProfile(userCredential.user);
    } catch (err) {
      console.error(err);
      setError('Đăng nhập thất bại: ' + err.message);
      setLoading(false);
    }
  };

  // --- SỬA LẠI: DEMO LOGIN VÀO USER CỐ ĐỊNH ---
  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    console.log(">>> [DEBUG] Bắt đầu đăng nhập Demo User cố định");

    try {
      // Đăng nhập thẳng vào tài khoản Demo đã định nghĩa
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        DEMO_CREDENTIALS.email, 
        DEMO_CREDENTIALS.password
      );

      console.log(">>> [DEBUG] Demo Auth thành công. UID:", userCredential.user.uid);
      
      // QUAN TRỌNG: Gọi hàm tạo profile để đảm bảo Demo User có dữ liệu trong Firestore
      // Vì giờ nó là user thật, nó cần document trong collection 'users'
      await createUserProfile(userCredential.user);

    } catch (err) {
      console.error('Lỗi demo:', err);
      // Xử lý lỗi sai pass hoặc chưa tạo user trên console
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Lỗi: Chưa tạo tài khoản Demo trên Firebase Console!');
      } else {
        setError(err.message);
      }
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
                type="email" required 
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="email@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input 
                type={showPassword ? 'text' : 'password'} required 
                className="w-full pl-12 pr-12 py-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2">
            {loading ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span> : 'Đăng Nhập'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={handleDemoLogin} disabled={loading} className="text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors inline-flex items-center gap-1 group">
            Xem Demo (Dữ liệu mẫu) <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;