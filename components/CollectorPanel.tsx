
import React, { useState } from 'react';
import { AppState, Donor, User, DonationRecord } from '../types';
import { 
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
  Calendar, 
  ClipboardList, 
  Phone,
  Edit3,
  CalendarDays
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
  const [lastProcessedDonor, setLastProcessedDonor] = useState<{name: string, amount: number, phone: string, date: string} | null>(null);
  const [pendingSelection, setPendingSelection] = useState<Donor | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const SYSTEM_START_DATE_STR = "2026-01";
  const activeMonthKey = state.currentMonthKey || SYSTEM_START_DATE_STR;
  const activeMonthDisplay = new Date(activeMonthKey + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });

  const getDonorBalance = (donor: Donor) => {
    const donorJoinMonthStr = (donor.joinDate || SYSTEM_START_DATE_STR).slice(0, 7);
    const effectiveStartStr = donorJoinMonthStr > SYSTEM_START_DATE_STR ? donorJoinMonthStr : SYSTEM_START_DATE_STR;
    
    if (activeMonthKey < effectiveStartStr) return 0;

    const [sYear, sMonth] = effectiveStartStr.split('-').map(Number);
    const [aYear, aMonth] = activeMonthKey.split('-').map(Number);
    const totalMonthsCount = (aYear - sYear) * 12 + (aMonth - sMonth) + 1;
    
    const donorHistory = state.donationHistory.filter(h => h.donorId === donor.id);
    const totalExpectedCumulative = totalMonthsCount * (donor.monthlyAmount || 0);
    const validPaidCumulative = donorHistory
      .filter(h => h.date.slice(0, 7) >= effectiveStartStr)
      .reduce((sum, h) => sum + (h.amount || 0), 0);
    
    return Math.max(0, totalExpectedCumulative - validPaidCumulative);
  };

  const myDonors = state.donors.filter(d => d.assignedCollectorId === user.id);
  
  const pendingDonors = myDonors.filter(d => {
    const isPaidThisMonth = state.donationHistory.some(h => 
      h.donorId === d.id && h.date.startsWith(activeMonthKey)
    );
    
    const matchesSearch = (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (d.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.phone || '').includes(searchTerm);
    
    return !isPaidThisMonth && matchesSearch;
  }).map(d => ({ ...d, totalBalance: getDonorBalance(d) }));
  
  const collectedDonors = state.donationHistory.filter(h => 
    h.collectorId === user.id && 
    h.date.startsWith(activeMonthKey)
  );

  const formatPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '92' + cleaned.substring(1);
    return cleaned;
  };

  const sendWhatsAppReceipt = (donorName: string, donorPhone: string, amount: number, date: string) => {
    const phone = formatPhoneNumber(donorPhone);
    const dateFormatted = new Date(date).toLocaleDateString('en-GB');
    const message = `Assalam-o-Alaikum *${donorName}*, Received donation of *Rs. ${amount.toLocaleString()}* on *${dateFormatted}* for *Esaar Blood Bank*. 🩸`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleOpenCollectModal = (donor: Donor) => {
    const balance = getDonorBalance(donor);
    setPendingSelection(donor);
    setManualAmount(balance.toString());
    setSelectedPaymentMethod('CASH');
    setSelectedDate(new Date().toISOString().split('T')[0]); // Reset to today
  };

  const handleCollect = () => {
    if (!pendingSelection) return;
    const amountToRecord = Number(manualAmount);

    if (isNaN(amountToRecord) || amountToRecord <= 0) {
      alert("Please enter a valid amount greater than zero.");
      return;
    }

    // We use the selectedDate but add current time to it to keep sortability consistent
    const finalDate = new Date(selectedDate);
    const now = new Date();
    finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newRecord: DonationRecord = {
      id: Math.random().toString(36).substr(2, 9),
      donorId: pendingSelection.id,
      donorName: pendingSelection.name,
      amount: amountToRecord,
      collectorId: user.id,
      collectorName: user.name,
      date: finalDate.toISOString(),
      paymentMethod: selectedPaymentMethod,
      receiptSent: true
    };

    const updatedDonors = state.donors.map(d => 
      d.id === pendingSelection.id ? { ...d, lastPaymentDate: selectedDate } : d
    );

    onUpdateState({ donors: updatedDonors, donationHistory: [newRecord, ...state.donationHistory] });
    setLastProcessedDonor({ name: pendingSelection.name, amount: amountToRecord, phone: pendingSelection.phone, date: selectedDate });
    setIsSuccessModalOpen(true);
    setPendingSelection(null);
  };

  const handleUpdatePassword = () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    const updatedCollectors = state.collectors.map(c => 
      c.id === user.id ? { ...c, password: newPassword } : c
    );
    onUpdateState({ collectors: updatedCollectors });
    setIsSettingsOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    alert("Password updated successfully!");
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-6 pb-24 animate-in fade-in duration-500">
      <div className="mb-4 bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
           <Calendar className="w-4 h-4 text-red-500" />
           <span className="text-[10px] font-black uppercase tracking-widest">{activeMonthDisplay} Collection</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           LIVE CLOUD
        </div>
      </div>

      <div className="justify-between items-center mb-6 flex">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Visit List</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Agent: {user.name}</p>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 shadow-sm hover:bg-slate-900 hover:text-white transition-all">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-[22px]">
        <button 
          onClick={() => setActiveTab('pending')} 
          className={`flex-1 py-3 px-4 rounded-[18px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'pending' ? 'bg-white text-red-600 shadow-sm' : 'bg-transparent text-slate-400'}`}
        >
          <Clock className="w-4 h-4" /> Pending
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`flex-1 py-3 px-4 rounded-[18px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-white text-red-600 shadow-sm' : 'bg-transparent text-slate-400'}`}
        >
          <History className="w-4 h-4" /> History
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="Search donor..." 
              className="w-full pl-11 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-red-100 transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          {pendingDonors.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <ClipboardList className="w-12 h-12 text-slate-100 mb-4" />
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No pending collections</p>
            </div>
          ) : (
            pendingDonors.map(donor => (
              <div key={donor.id} onClick={() => handleOpenCollectModal(donor)} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer hover:shadow-md">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-slate-900 tracking-tight text-base">{donor.name}</span>
                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase">{donor.city}</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-900 font-black">
                    <Phone className="w-3.5 h-3.5 text-red-600" />
                    <span>{donor.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">
                    <MapPin className="w-3 h-3" /> {donor.city}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receivable</p>
                  <p className="text-lg font-black text-slate-900 tracking-tighter">Rs. {donor.totalBalance.toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {collectedDonors.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
              <div key={record.id} className="bg-white p-5 rounded-[24px] shadow-sm flex justify-between items-center border border-slate-50">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${record.paymentMethod === 'ONLINE' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                    {record.paymentMethod === 'ONLINE' ? <Globe className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm leading-tight">{record.donorName}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase mt-1">
                      {new Date(record.date).toLocaleDateString('en-GB')} • {record.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600 text-sm tracking-tight">Rs. {record.amount.toLocaleString()}</p>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* COLLECTION MODAL (Improved with Date Picker) */}
      {pendingSelection && (
        <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{pendingSelection.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pendingSelection.phone}</p>
              </div>
              <button onClick={() => setPendingSelection(null)} className="p-2 bg-slate-50 rounded-full text-slate-300 hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {/* Amount field */}
              <div className="bg-slate-50 p-6 rounded-3xl flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    Amount <Edit3 className="w-2.5 h-2.5" />
                  </p>
                  <div className="flex items-center">
                    <span className="text-2xl font-black text-slate-900 mr-1">Rs.</span>
                    <input 
                      type="number" 
                      className="bg-transparent text-2xl font-black text-slate-900 outline-none w-full"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Full Due</p>
                  <p className="text-xs font-black text-slate-400">Rs. {getDonorBalance(pendingSelection).toLocaleString()}</p>
                </div>
              </div>

              {/* Date Field */}
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <CalendarDays className="w-3 h-3" /> Collection Date
                </p>
                <input 
                  type="date" 
                  className="bg-transparent text-base font-black text-slate-900 outline-none w-full cursor-pointer"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedPaymentMethod('CASH'); }}
                className={`py-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${selectedPaymentMethod === 'CASH' ? 'border-red-600 bg-red-50 text-red-600' : 'border-slate-100 bg-white text-slate-400'}`}
              >
                <Wallet className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cash</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedPaymentMethod('ONLINE'); }}
                className={`py-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${selectedPaymentMethod === 'ONLINE' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 bg-white text-slate-400'}`}
              >
                <Globe className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Online</span>
              </button>
            </div>

            <button onClick={(e) => { e.stopPropagation(); handleCollect(); }} className="w-full py-5 bg-red-600 text-white rounded-[22px] font-black uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all">
              Record Collection
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {isSuccessModalOpen && lastProcessedDonor && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-6">
          <div className="bg-white w-full max-w-sm rounded-[45px] shadow-2xl p-10 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-emerald-600 fill-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Done!</h3>
            <p className="text-slate-400 font-bold text-sm mb-8 leading-relaxed">
              Collection of <span className="text-slate-900 font-black">Rs. {lastProcessedDonor.amount.toLocaleString()}</span> from <span className="text-slate-900 font-black">{lastProcessedDonor.name}</span> has been recorded.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => { sendWhatsAppReceipt(lastProcessedDonor.name, lastProcessedDonor.phone, lastProcessedDonor.amount, lastProcessedDonor.date); setIsSuccessModalOpen(false); }}
                className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <MessageSquare className="w-4 h-4" /> Send WhatsApp Receipt
              </button>
              <button 
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-sm rounded-[40px] shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5 text-slate-300"/></button>
            </div>
            <div className="space-y-4 mb-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type={showPass ? "text" : "password"} 
                    className="w-full pl-11 pr-11 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-slate-200 transition-all" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                  />
                  <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type={showPass ? "text" : "password"} 
                    className="w-full pl-11 pr-11 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-slate-200 transition-all" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                  />
                </div>
              </div>
            </div>
            <button onClick={handleUpdatePassword} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm shadow-xl">Update Password</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectorPanel;
