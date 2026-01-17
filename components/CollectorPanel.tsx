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
  AlertCircle,
  Calendar
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
  const [lastProcessedDonor, setLastProcessedDonor] = useState<{name: string, amount: number} | null>(null);
  const [pendingSelection, setPendingSelection] = useState<Donor | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const SYSTEM_START_DATE = new Date("2026-01-01");
  const activeMonthKey = state.currentMonthKey || new Date().toISOString().slice(0, 7);
  const activeMonthDisplay = new Date(activeMonthKey + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });

  // LOGIC FIX: Debt starts tracking from Jan 2026 for logical testing
  const getDonorBalance = (donor: Donor) => {
    const joinDate = new Date(donor.joinDate);
    const trackingStartDate = joinDate > SYSTEM_START_DATE ? joinDate : SYSTEM_START_DATE;
    const currentDate = new Date(activeMonthKey + "-01");
    
    if (currentDate < trackingStartDate) return 0;

    let months = (currentDate.getFullYear() - trackingStartDate.getFullYear()) * 12;
    months -= trackingStartDate.getMonth();
    months += currentDate.getMonth();
    months = Math.max(0, months + 1);

    const totalExpected = months * donor.monthlyAmount;
    const totalPaid = state.donationHistory
      .filter(h => h.donorId === donor.id)
      .reduce((sum, h) => sum + h.amount, 0);
    
    return totalExpected - totalPaid;
  };

  const myDonors = state.donors.filter(d => d.assignedCollectorId === user.id);
  const pendingDonors = myDonors.filter(d => 
    d.status === 'PENDING' && 
    ((d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
     (d.city || '').toLowerCase().includes(searchTerm.toLowerCase()))
  ).map(d => ({ ...d, totalBalance: getDonorBalance(d) }));
  
  const collectedDonors = state.donationHistory.filter(h => 
    h.collectorId === user.id && 
    h.date.startsWith(activeMonthKey)
  );

  const formatPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '92' + cleaned.substring(1);
    return cleaned;
  };

  const sendWhatsAppReceipt = (donorName: string, donorPhone: string, amount: number) => {
    const phone = formatPhoneNumber(donorPhone);
    const message = `Assalam-o-Alaikum *${donorName}*, Received donation of *Rs. ${amount.toLocaleString()}* for *Esaar Blood Bank*. 🩸`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCollect = () => {
    if (!pendingSelection) return;
    const totalDue = getDonorBalance(pendingSelection);

    const newRecord: DonationRecord = {
      id: Math.random().toString(36).substr(2, 9),
      donorId: pendingSelection.id,
      donorName: pendingSelection.name,
      amount: totalDue,
      collectorId: user.id,
      collectorName: user.name,
      date: new Date().toISOString(),
      paymentMethod: selectedPaymentMethod,
      receiptSent: true
    };

    const updatedDonors = state.donors.map(d => 
      d.id === pendingSelection.id ? { ...d, status: 'COLLECTED' as const, lastPaymentDate: new Date().toISOString().split('T')[0] } : d
    );

    onUpdateState({ donors: updatedDonors, donationHistory: [newRecord, ...state.donationHistory] });
    setLastProcessedDonor({ name: pendingSelection.name, amount: totalDue });
    setIsSuccessModalOpen(true);
    setPendingSelection(null);
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-6 pb-24">
      <div className="mb-4 bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
           <Calendar className="w-4 h-4 text-red-500" />
           <span className="text-[10px] font-black uppercase tracking-widest">{activeMonthDisplay} List</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
           <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
           LIVE STATUS
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Visit List</h1><p className="text-sm font-medium text-slate-500">Collector: {user.name}</p></div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white rounded-xl border border-slate-100 text-slate-400 shadow-sm"><Settings className="w-5 h-5" /></button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 px-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'pending' ? 'bg-red-600 text-white shadow-xl' : 'bg-white text-slate-500'}`}><Clock className="w-5 h-5" /> Pending</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 px-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-red-600 text-white shadow-xl' : 'bg-white text-slate-500'}`}><History className="w-5 h-5" /> History</button>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="relative mb-4"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search donors..." className="w-full pl-11 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          {pendingDonors.map(donor => (
            <div key={donor.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
              {donor.totalBalance > donor.monthlyAmount && <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase">Arrears Due</div>}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white"><Users className="w-6 h-6"/></div><div><h3 className="text-lg font-black text-slate-900">{donor.name}</h3><div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold"><MapPin className="w-3 h-3 text-red-400" /> {donor.city}</div></div></div>
                <div className="text-right"><p className="text-xl font-black text-slate-900">Rs. {donor.totalBalance.toLocaleString()}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <a href={`tel:${donor.phone}`} className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 rounded-2xl text-slate-700 font-black text-xs uppercase"><MessageCircle className="w-4 h-4" /> Call</a>
                <button onClick={() => setPendingSelection(donor)} className="flex items-center justify-center gap-2 py-3.5 bg-slate-900 rounded-2xl text-white font-black text-xs uppercase"><DollarSign className="w-4 h-4" /> Collect</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {collectedDonors.map(record => (
            <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${record.paymentMethod === 'ONLINE' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>{record.paymentMethod === 'ONLINE' ? <Globe className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}</div>
                <div><h4 className="font-black text-slate-900 text-sm">{record.donorName}</h4><p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(record.date).toLocaleTimeString()}</p></div>
              </div>
              <div className="text-right"><p className="font-black text-emerald-600 text-sm">Rs. {record.amount.toLocaleString()}</p></div>
            </div>
          ))}
        </div>
      )}

      {pendingSelection && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xs rounded-[32px] shadow-2xl p-6 text-center">
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-6">Confirm Collection</h3>
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Receivable</p>
               <p className="text-2xl font-black text-slate-900">Rs. {getDonorBalance(pendingSelection).toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setSelectedPaymentMethod('CASH')} className={`p-4 rounded-2xl border-2 ${selectedPaymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100'}`}><Wallet className="w-8 h-8 mx-auto mb-2 text-emerald-600" /><span className="text-[10px] font-black uppercase">Cash</span></button>
              <button onClick={() => setSelectedPaymentMethod('ONLINE')} className={`p-4 rounded-2xl border-2 ${selectedPaymentMethod === 'ONLINE' ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}><Globe className="w-8 h-8 mx-auto mb-2 text-blue-600" /><span className="text-[10px] font-black uppercase">Online</span></button>
            </div>
            <button onClick={handleCollect} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl">Confirm</button>
            <button onClick={() => setPendingSelection(null)} className="mt-2 w-full py-4 text-slate-400 font-black uppercase text-xs">Cancel</button>
          </div>
        </div>
      )}

      {isSuccessModalOpen && lastProcessedDonor && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-sm rounded-[40px] shadow-2xl overflow-hidden text-center p-8">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><Heart className="w-10 h-10 text-white animate-pulse" /></div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Received!</h2>
            <p className="font-bold text-slate-500 mb-8">Rs. {lastProcessedDonor.amount.toLocaleString()} received successfully.</p>
            <button onClick={() => sendWhatsAppReceipt(lastProcessedDonor.name, '', lastProcessedDonor.amount)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-3 mb-3"><MessageSquare className="w-5 h-5" /> Send Receipt</button>
            <button onClick={() => setIsSuccessModalOpen(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-sm">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectorPanel;
