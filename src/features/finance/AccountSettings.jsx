import React, { useState } from 'react';
import { CreditCard, Edit, Eye, EyeOff, Landmark, PlusCircle, Trash2, X } from 'lucide-react';
import { Card } from '../../components/common/Card';

const EMPTY_FORM = {
  name: '',
  type: 'bank',
  institution: '',
  last4: '',
  ingestEnabled: true,
  includeInReports: true,
};

export default function AccountSettings({
  accounts,
  addAccount,
  updateAccount,
  deleteAccount,
  checkPermission,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const openCreate = () => {
    if (!checkPermission()) return;
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (account) => {
    if (!checkPermission()) return;
    setEditingId(account.id);
    setFormData({
      name: account.name || '',
      type: account.type || 'bank',
      institution: account.institution || '',
      last4: account.last4 || '',
      ingestEnabled: account.ingestEnabled !== false,
      includeInReports: account.includeInReports !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...formData,
      name: formData.name.trim(),
      institution: formData.institution.trim(),
      last4: formData.last4.replace(/\D/g, '').slice(-4),
    };
    if (!payload.name || payload.last4.length !== 4) return;
    if (editingId) await updateAccount(editingId, payload);
    else await addAccount(payload);
    setShowModal(false);
  };

  const toggle = async (account, field) => {
    if (!checkPermission()) return;
    await updateAccount(account.id, { [field]: account[field] === false });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Landmark size={24} className="text-gray-400" /> Tài khoản được theo dõi
          </h3>
          <p className="text-gray-500 mt-1">
            Chỉ email khớp 4 số cuối của tài khoản bật “Tự động nhập” mới được đưa vào hệ thống.
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl font-bold">
          <PlusCircle size={18} /> Thêm tài khoản
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className={`p-3 rounded-xl ${account.type === 'credit_card' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                {account.type === 'credit_card' ? <CreditCard size={24} /> : <Landmark size={24} />}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(account)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Edit size={17} /></button>
                <button onClick={() => { if (checkPermission()) deleteAccount(account.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={17} /></button>
              </div>
            </div>
            <h4 className="font-bold text-lg text-gray-800 mt-4">{account.name}</h4>
            <p className="text-sm text-gray-500">{account.institution || 'Chưa nhập ngân hàng'} •••• {account.last4}</p>
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
              <button onClick={() => toggle(account, 'ingestEnabled')} className="w-full flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">Tự động nhập từ Gmail</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${account.ingestEnabled !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {account.ingestEnabled !== false ? 'Đang bật' : 'Đã tắt'}
                </span>
              </button>
              <button onClick={() => toggle(account, 'includeInReports')} className="w-full flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600 flex items-center gap-1.5">{account.includeInReports !== false ? <Eye size={15} /> : <EyeOff size={15} />} Tính trong báo cáo</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${account.includeInReports !== false ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {account.includeInReports !== false ? 'Có' : 'Không'}
                </span>
              </button>
            </div>
          </Card>
        ))}
        {accounts.length === 0 && (
          <button onClick={openCreate} className="col-span-full border-2 border-dashed border-slate-200 rounded-3xl py-14 text-gray-400 hover:text-blue-600 hover:border-blue-300">
            <Landmark size={42} className="mx-auto mb-3 opacity-30" />
            <span className="font-bold">Thêm STK hoặc thẻ tín dụng đầu tiên</span>
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingId ? 'Cập nhật tài khoản' : 'Thêm tài khoản'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-gray-100 rounded-full"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Loại tài khoản</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="custom-select w-full p-3 border border-slate-200 rounded-xl bg-white">
                  <option value="bank">Tài khoản ngân hàng</option>
                  <option value="credit_card">Thẻ tín dụng</option>
                  <option value="cash">Tiền mặt / khác</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên hiển thị</label>
                <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: VCB nhận lương" className="w-full p-3 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngân hàng / tổ chức</label>
                <input value={formData.institution} onChange={(e) => setFormData({ ...formData, institution: e.target.value })} placeholder="VD: Vietcombank" className="w-full p-3 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">4 số cuối</label>
                <input required inputMode="numeric" pattern="[0-9]{4}" maxLength="4" value={formData.last4} onChange={(e) => setFormData({ ...formData, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1234" className="w-full p-3 border border-slate-200 rounded-xl text-lg font-bold tracking-widest" />
                <p className="text-xs text-gray-400 mt-1">Không lưu toàn bộ số tài khoản nguồn.</p>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">{editingId ? 'Lưu thay đổi' : 'Thêm tài khoản'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
