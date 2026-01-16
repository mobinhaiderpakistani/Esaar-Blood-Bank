
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
  EyeOff
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
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const myDonors = state.donors.filter(d => d.assignedCollectorId === user.id);
  const pendingDonors = myDonors.filter(d => 
    d.status === 'PENDING' && 
    ((d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
     (d.city || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Filtering collector history by current month
  const collectedDonors = state.donationHistory.filter(h => 
    h.collectorId === user.id && 
    (!state.currentMonthKey || h.date.startsWith(state.currentMonthKey))
  );

  const formatPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '92' + cleaned.substring(1);
    return cleaned;
  };

  const sendWhatsAppReceipt = (donor: Donor, amount: number) => {
    const phone = formatPhoneNumber(donor.phone);
    const message = `Assalam-o-Alaikum *${donor.name}*, JazakAllah! We have successfully received your monthly donation of *Rs. ${amount.toLocaleString()}* for *Esaar Blood Bank*. Your contribution helps us save lives. 🩸`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
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

  const handleChangePassword = () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    const updatedCollectors = state.collectors.map(c => c.id === user.id ? { ...c, password: newPassword } : c);
    onUpdateState({ collectors: updatedCollectors });
    setIsSettingsOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    alert("Password updated successfully!");
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Visit List</h1><p className="text-sm font-medium text-slate-500">Welcome, {user.name.split(' ')[0]}</p></div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white rounded-xl border border-slate-100 text-slate-400 shadow-sm"><Settings className="w-5 h-5" /></button>
        </div>
        <div className="bg-red-50 px-3 py-2 rounded-2xl text-center border border-red-100"><span className="text-[10px] text-red-400 block font-black uppercase tracking-widest">Pending</span><span className="text-xl font-black text-red-600 leading-none">{pendingDonors.length}</span></div>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 px-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'pending' ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Clock className="w-5 h-5" /> Pending</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 px-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-red-600 text-white shadow-xl shadow-red-100' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><History className="w-5 h-5" /> History</button>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="relative mb-4"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search donors..." className="w-full pl-11 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm text-sm font-medium focus:ring-2 focus:ring-red-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          {pendingDonors.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-dashed border-slate-200"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" /><p className="text-slate-900 font-black">All Collected!</p></div>
          ) : (
            pendingDonors.map(donor => (
              <div key={donor.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-100"><Users className="w-6 h-6"/></div><div><h3 className="text-lg font-black text-slate-900">{donor.name}</h3><div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold"><MapPin className="w-3 h-3 text-red-400" /> {donor.city || 'N/A'}</div></div></div>
                  <div className="text-right"><p className="text-xl font-black text-slate-900 leading-tight">Rs. {donor.monthlyAmount}</p></div>
                </div>
                <div className="space-y-1 mb-5"><p className="text-[11px] text-slate-500 font-bold line-clamp-1">Address: {donor.address}</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <a href={`tel:${donor.phone}`} className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 rounded-2xl text-slate-700 font-black text-xs uppercase"><MessageCircle className="w-4 h-4" /> Call</a>
                  <button onClick={() => setPendingSelection(donor)} className="flex items-center justify-center gap-2 py-3.5 bg-slate-900 rounded-2xl text-white font-black text-xs uppercase"><DollarSign className="w-4 h-4" /> Collect</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {collectedDonors.length === 0 && <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-dashed border-slate-200"><p className="text-slate-400 text-sm font-medium">No records found</p></div>}
          {collectedDonors.map(record => (
            <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${record.paymentMethod === 'ONLINE' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>{record.paymentMethod === 'ONLINE' ? <Globe className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}</div>
                <div><h4 className="font-black text-slate-900 text-sm">{record.donorName}</h4><p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{new Date(record.date).toLocaleTimeString()} • {record.paymentMethod}</p></div>
              </div>
              <div className="text-right"><p className="font-black text-emerald-600 text-sm">Rs. {record.amount.toLocaleString()}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Modal (Password Change) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xs rounded-[32px] shadow-2xl p-8 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center mb-6"><h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Security Settings</h3><button onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5 text-slate-300"/></button></div>
            <div className="space-y-4 mb-8">
              <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type={showPassword ? "text" : "password"} placeholder="New Password"  className="w-full pl-11 pr-11 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} /><button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type={showPassword ? "text" : "password"} placeholder="Confirm Password" className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
            </div>
            <button onClick={handleChangePassword} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm shadow-xl">Update Password</button>
          </div>
        </div>
      )}

      {pendingSelection && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xs rounded-[32px] shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6"><h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Payment Method</h3><button onClick={() => setPendingSelection(null)}><X className="w-5 h-5 text-slate-300"/></button></div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setSelectedPaymentMethod('CASH')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${selectedPaymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}><Wallet className={`w-8 h-8 ${selectedPaymentMethod === 'CASH' ? 'text-emerald-600' : 'text-slate-300'}`} /><span className={`text-[10px] font-black uppercase ${selectedPaymentMethod === 'CASH' ? 'text-emerald-700' : 'text-slate-400'}`}>Cash</span></button>
              <button onClick={() => setSelectedPaymentMethod('ONLINE')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${selectedPaymentMethod === 'ONLINE' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}><Globe className={`w-8 h-8 ${selectedPaymentMethod === 'ONLINE' ? 'text-blue-600' : 'text-slate-300'}`} /><span className={`text-[10px] font-black uppercase ${selectedPaymentMethod === 'ONLINE' ? 'text-blue-700' : 'text-slate-400'}`}>Online</span></button>
            </div>
            <button onClick={handleCollect} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl">Confirm Collection</button>
          </div>
        </div>
      )}

      {isSuccessModalOpen && lastProcessedDonor && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden text-center">
            <div className="p-8 bg-emerald-500 text-white"><Heart className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" /><h2 className="text-3xl font-black">Received!</h2><p className="font-bold">Rs. {lastProcessedDonor.monthlyAmount.toLocaleString()} received.</p></div>
            <div className="p-8 space-y-4">
              <p className="text-slate-600 text-sm font-medium leading-relaxed mb-2">Thank you *${lastProcessedDonor.name}* for your donation to Esaar Blood Bank. Your support helps us save lives!</p>
              <button onClick={() => sendWhatsAppReceipt(lastProcessedDonor, lastProcessedDonor.monthlyAmount)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-lg shadow-emerald-100"><MessageSquare className="w-5 h-5" /> Send WhatsApp Receipt</button>
              <button onClick={() => setIsSuccessModalOpen(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-sm">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectorPanel;
