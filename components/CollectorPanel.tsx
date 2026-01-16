import React, { useState } from 'react';
import { AppState, Donor, User, DonationRecord } from '../types';
import { 
  CheckCircle2, 
  MapPin, 
  DollarSign, 
  History, 
  Search,
  MessageCircle,
  Clock,
  X,
  Heart,
  Globe,
  Wallet,
  Users,
  MessageSquare,
  Settings,
  Lock,
  Eye,
  EyeOff,
  PhoneCall
} from 'lucide-react';

interface Props {
  user: User;
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
  activeTab: 'pending' | 'history';
  setActiveTab: (tab: 'pending' | 'history') => void;
}

const CollectorPanel: React.FC<Props> = ({ user, state, onUpdateState, activeTab, setActiveTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastProcessedDonor, setLastProcessedDonor] = useState<Donor | null>(null);
  const [pendingSelection, setPendingSelection] = useState<Donor | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const myDonors = state.donors.filter(d => d.assignedCollectorId === user.id);
  const pendingDonors = myDonors.filter(d => 
    d.status === 'PENDING' && 
    (d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.phone.includes(searchTerm))
  );
  
  const collectedDonors = state.donationHistory.filter(h => 
    h.collectorId === user.id && 
    (!state.currentMonthKey || h.date.startsWith(state.currentMonthKey))
  );

  const sendWhatsAppReceipt = (donor: Donor, amount: number) => {
    let phone = donor.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '92' + phone.substring(1);
    const message = `السلام علیکم! *${donor.name}*، جزاک اللہ! ہمیں آپ کا ماہانہ عطیہ برائے *ایثار بلڈ بینک* مبلغ *${amount.toLocaleString()} روپے* وصول ہو چکا ہے۔ آپ کا یہ تعاون انسانی جانیں بچانے میں مددگار ثابت ہوتا ہے۔ 🩸`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCollect = () => {
    if (!pendingSelection) return;
    const donor = pendingSelection;
    const newRecord: DonationRecord = {
      id: Math.random().toString(36).substr(2, 9),
      donorId: donor.id,
      donorName: donor.name,
      amount: donor.monthlyAmount,
      collectorId: user.id,
      collectorName: user.name,
      date: new Date().toISOString(),
      paymentMethod: selectedPaymentMethod,
      receiptSent: true
    };
    const updatedDonors = state.donors.map(d => d.id === donor.id ? { ...d, status: 'COLLECTED' as const, lastPaymentDate: new Date().toISOString().split('T')[0] } : d);
    onUpdateState({ donors: updatedDonors, donationHistory: [newRecord, ...state.donationHistory] });
    setLastProcessedDonor(donor);
    setIsSuccessModalOpen(true);
    setPendingSelection(null);
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-6 pb-24 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Visit List</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Collector: {user.name.split(' ')[0]}</p>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-white rounded-2xl border border-slate-100 text-slate-300 shadow-sm active:scale-95 transition-transform"><Settings className="w-5 h-5" /></button>
      </div>

      <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-[24px] border border-slate-100 shadow-sm">
        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-4 px-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'pending' ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'text-slate-400'}`}><Clock className="w-4 h-4" /> Pending ({pendingDonors.length})</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 px-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'text-slate-400'}`}><History className="w-4 h-4" /> History</button>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input type="text" placeholder="Search donors..." className="w-full pl-11 pr-4 py-5 bg-white border-none rounded-[24px] shadow-sm text-sm font-black focus:ring-2 focus:ring-red-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          
          {pendingDonors.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[40px] shadow-sm border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-emerald-500" /></div>
              <p className="text-slate-900 font-black text-xl tracking-tight">Everything Collected!</p>
              <p className="text-slate-400 text-xs font-black uppercase mt-2 tracking-widest">Great job for today.</p>
            </div>
          ) : (
            pendingDonors.map(donor => (
              <div key={donor.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 hover:border-red-100 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400"><Users className="w-7 h-7"/></div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{donor.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest"><MapPin className="w-3 h-3 text-red-500" /> {donor.city}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-600 tracking-tight leading-none">Rs. {donor.monthlyAmount}</p>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monthly</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl mb-6">
                  <p className="text-[11px] text-slate-600 font-black uppercase tracking-widest mb-1 opacity-50">Address</p>
                  <p className="text-xs font-bold text-slate-800 leading-relaxed">{donor.address}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <a href={`tel:${donor.phone}`} className="flex items-center justify-center gap-2 py-4 bg-white border border-slate-100 rounded-[20px] text-slate-900 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"><PhoneCall className="w-4 h-4" /> Call</a>
                  <button onClick={() => setPendingSelection(donor)} className="flex items-center justify-center gap-2 py-4 bg-slate-900 rounded-[20px] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-95 transition-all"><DollarSign className="w-4 h-4" /> Collect</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {collectedDonors.length === 0 && <div className="text-center py-20"><p className="text-slate-400 text-xs font-black uppercase tracking-widest">No collections yet</p></div>}
          {collectedDonors.map(record => (
            <div key={record.id} className="bg-white p-5 rounded-[24px] shadow-sm flex justify-between items-center border border-slate-50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${record.paymentMethod === 'ONLINE' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>{record.paymentMethod === 'ONLINE' ? <Globe className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}</div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm tracking-tight">{record.donorName}</h4>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{new Date(record.date).toLocaleTimeString()} • {record.paymentMethod}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-600 text-sm">Rs. {record.amount.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Security Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-slate-50 rounded-xl text-slate-300"><X className="w-4 h-4"/></button>
            </div>
            <div className="space-y-4 mb-8">
              <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /><input type={showPassword ? "text" : "password"} placeholder="New Password"  className="w-full pl-11 pr-11 py-5 bg-slate-50 border-none rounded-[20px] font-black text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} /><button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              <input type={showPassword ? "text" : "password"} placeholder="Confirm Password" className="w-full px-6 py-5 bg-slate-50 border-none rounded-[20px] font-black text-sm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <button onClick={() => { alert("Password Updated!"); setIsSettingsOpen(false); }} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl">Update Password</button>
          </div>
        </div>
      )}

      {pendingSelection && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8"><h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Select Method</h3><button onClick={() => setPendingSelection(null)} className="p-2 bg-slate-50 rounded-xl text-slate-300"><X className="w-4 h-4"/></button></div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button onClick={() => setSelectedPaymentMethod('CASH')} className={`flex flex-col items-center gap-4 p-6 rounded-[32px] border-4 transition-all ${selectedPaymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 bg-white opacity-50'}`}><div className={`p-4 rounded-2xl ${selectedPaymentMethod === 'CASH' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Wallet className="w-8 h-8" /></div><span className="text-[10px] font-black uppercase tracking-widest">Cash</span></button>
              <button onClick={() => setSelectedPaymentMethod('ONLINE')} className={`flex flex-col items-center gap-4 p-6 rounded-[32px] border-4 transition-all ${selectedPaymentMethod === 'ONLINE' ? 'border-blue-500 bg-blue-50' : 'border-slate-50 bg-white opacity-50'}`}><div className={`p-4 rounded-2xl ${selectedPaymentMethod === 'ONLINE' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Globe className="w-8 h-8" /></div><span className="text-[10px] font-black uppercase tracking-widest">Online</span></button>
            </div>
            <button onClick={handleCollect} className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-100">Complete Collection</button>
          </div>
        </div>
      )}

      {isSuccessModalOpen && lastProcessedDonor && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/80 backdrop-blur-lg p-6">
          <div className="bg-white w-full max-w-sm rounded-[48px] shadow-2xl overflow-hidden text-center animate-in slide-in-from-bottom-12">
            <div className="p-10 bg-emerald-500 text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6"><Heart className="w-10 h-10 text-white animate-pulse" /></div>
              <h2 className="text-3xl font-black tracking-tighter">Received!</h2>
              <p className="font-black text-xs uppercase tracking-widest opacity-80 mt-2">Rs. {lastProcessedDonor.monthlyAmount.toLocaleString()} Confirmed</p>
            </div>
            <div className="p-10 space-y-4">
              <button onClick={() => sendWhatsAppReceipt(lastProcessedDonor, lastProcessedDonor.monthlyAmount)} className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 active:scale-95 transition-all"><MessageSquare className="w-5 h-5" /> Send WhatsApp</button>
              <button onClick={() => setIsSuccessModalOpen(false)} className="w-full py-5 bg-slate-50 text-slate-400 rounded-[24px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectorPanel;