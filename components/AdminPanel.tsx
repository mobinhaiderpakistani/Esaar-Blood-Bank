import React, { useState, useRef } from 'react';
import { AppState, Donor, User, UserRole, DonationRecord } from '../types';
import { 
  Users, 
  UserCheck, 
  BarChart3, 
  Plus, 
  Search,
  CheckCircle2,
  X,
  History,
  Phone,
  MapPin,
  Edit2,
  Building2,
  Wallet,
  Globe,
  FileText,
  Printer,
  Trash2,
  MessageCircle,
  Save,
  Settings,
  ChevronLeft,
  UserPlus,
  AlertCircle,
  Download,
  Upload,
  Database,
  BookmarkCheck,
  RotateCcw,
  Trash,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FastForward,
  CalendarDays
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';

interface Props {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const AdminPanel: React.FC<Props> = ({ state, onUpdateState }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'donors' | 'collectors' | 'history' | 'maintenance'>('dashboard');
  const [showAreaManagement, setShowAreaManagement] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COLLECTED' | 'PENDING'>('ALL');
  
  const [showDeleteDonorConfirm, setShowDeleteDonorConfirm] = useState<Donor | null>(null);
  const [selectedDonorForLedger, setSelectedDonorForLedger] = useState<Donor | null>(null);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [editingCollector, setEditingCollector] = useState<User | null>(null);
  const [collectorToDelete, setCollectorToDelete] = useState<User | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCity, setNewCity] = useState('');

  const isSuperAdmin = state.currentUser?.role === UserRole.SUPER_ADMIN;

  const [showAddDonorModal, setShowAddDonorModal] = useState(false);
  const [newDonorData, setNewDonorData] = useState({
    name: '',
    phone: '',
    address: '',
    city: state.cities[0] || '',
    monthlyAmount: 1000,
    assignedCollectorId: '',
    referredBy: ''
  });

  const [showAddCollectorModal, setShowAddCollectorModal] = useState(false);
  const [newCollectorData, setNewCollectorData] = useState({
    name: '',
    phone: '',
    username: '',
    password: '123',
    city: state.cities[0] || ''
  });

  const SYSTEM_START_DATE_STR = "2026-01";
  const today = new Date();
  const currentSystemMonthKey = today.toISOString().slice(0, 7); 
  const activeMonthKey = state.currentMonthKey || currentSystemMonthKey;
  const activeMonthDate = new Date(activeMonthKey + "-01");
  const monthName = activeMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const isResetDone = state.currentMonthKey === currentSystemMonthKey;

  const donorsListRaw = state.donors || [];
  const historyRaw = state.donationHistory || [];
  const citiesRaw = state.cities || [];
  const collectorsRaw = state.collectors || [];

  const cityFiltered = selectedCityFilter === 'All' ? donorsListRaw : donorsListRaw.filter(d => d.city === selectedCityFilter);
  const donorsList = cityFiltered.filter(d => {
    const matchesSearch = (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.phone || '').includes(searchTerm);
    return matchesSearch;
  });

  const getDonorBalanceMetrics = (donor: Donor) => {
    const joinMonthStr = donor.joinDate.slice(0, 7);
    const effectiveStartStr = joinMonthStr > SYSTEM_START_DATE_STR ? joinMonthStr : SYSTEM_START_DATE_STR;
    
    if (activeMonthKey < effectiveStartStr) return { balance: 0, arrears: 0 };

    const [startYear, startMonth] = effectiveStartStr.split('-').map(Number);
    const [activeYear, activeMonth] = activeMonthKey.split('-').map(Number);
    
    // Total months including current
    const monthsDiff = (activeYear - startYear) * 12 + (activeMonth - startMonth) + 1;

    const totalExpected = monthsDiff * donor.monthlyAmount;
    const totalPaid = historyRaw
      .filter(h => h.donorId === donor.id)
      .reduce((sum, h) => sum + h.amount, 0);
    
    // Balance = Paid - Expected (Negative means debt/due)
    const balance = totalPaid - totalExpected;
    
    const currentMonthPaid = historyRaw.some(h => h.donorId === donor.id && h.date.startsWith(activeMonthKey));
    
    // Arrears = Debt from previous months (Balance + Current month if not paid)
    const arrears = currentMonthPaid ? (balance) : (balance + donor.monthlyAmount);

    return { balance, arrears };
  };

  const totalTarget = cityFiltered.reduce((sum, d) => sum + (d.monthlyAmount || 0), 0);
  
  const historyList = historyRaw
    .filter(h => h.date.startsWith(activeMonthKey))
    .filter(h => {
      if (selectedCityFilter === 'All') return true;
      const d = donorsListRaw.find(donor => donor.id === h.donorId);
      return d && d.city === selectedCityFilter;
    });

  const historyTotalSum = historyList.reduce((sum, h) => sum + (h.amount || 0), 0);
  const cashSum = historyList.filter(h => h.paymentMethod === 'CASH').reduce((sum, h) => sum + (h.amount || 0), 0);
  const onlineSum = historyList.filter(h => h.paymentMethod === 'ONLINE').reduce((sum, h) => sum + (h.amount || 0), 0);
  
  // Total arrears is the sum of previous month debts
  const totalArrearsGlobal = cityFiltered.reduce((sum, d) => sum + Math.abs(getDonorBalanceMetrics(d).arrears), 0);

  const pendingAmount = totalTarget - historyTotalSum;
  const totalCollectedCount = cityFiltered.filter(d => d.status === 'COLLECTED').length;
  const totalPendingCount = cityFiltered.filter(d => d.status === 'PENDING').length;

  const comprehensiveHistory = cityFiltered
    .filter(d => statusFilter === 'ALL' ? true : d.status === statusFilter)
    .map(donor => {
      const metrics = getDonorBalanceMetrics(donor);
      return { ...donor, ...metrics };
    })
    .sort((a, b) => {
      if (a.status === b.status) return a.name.localeCompare(b.name);
      return a.status === 'COLLECTED' ? -1 : 1;
    });

  const barData = citiesRaw.map(c => ({
    name: c,
    target: donorsListRaw.filter(d => d.city === c).reduce((s, d) => s + (d.monthlyAmount || 0), 0),
    collected: historyRaw.filter(h => {
      const d = donorsListRaw.find(donor => donor.id === h.donorId);
      return d && d.city === c && h.date.startsWith(activeMonthKey);
    }).reduce((s, h) => s + (h.amount || 0), 0)
  })).filter(x => x.target > 0);

  const statusPieData = [
    { name: 'Paid', value: totalCollectedCount, color: '#10b981' },
    { name: 'Pending', value: totalPendingCount, color: '#ef4444' }
  ];

  const paymentPieData = [
    { name: 'Cash', value: cashSum, color: '#f59e0b' },
    { name: 'Online', value: onlineSum, color: '#3b82f6' }
  ];

  const triggerMonthlyReset = () => {
    if (isResetDone) return;
    if (window.confirm(`کیا آپ ${monthName} کی کلیکشن لسٹ بنانا چاہتے ہیں؟`)) {
      const resetDonors = (state.donors || []).map(d => ({ ...d, status: 'PENDING' as const }));
      onUpdateState({ donors: resetDonors, currentMonthKey: currentSystemMonthKey });
    }
  };

  const simulateNextMonth = () => {
    const nextDate = new Date(activeMonthDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    const nextMonthKey = nextDate.toISOString().slice(0, 7);
    if (window.confirm(`ٹیسٹنگ: کیا آپ اگلے مہینے (${nextDate.toLocaleString('default', { month: 'long', year: 'numeric' })}) کی لسٹ جنریٹ کرنا چاہتے ہیں؟`)) {
      const resetDonors = (state.donors || []).map(d => ({ ...d, status: 'PENDING' as const }));
      onUpdateState({ donors: resetDonors, currentMonthKey: nextMonthKey });
      alert("اگلے مہینے کی لسٹ کامیابی سے جنریٹ ہو گئی۔");
      setActiveTab('dashboard');
    }
  };

  const deleteDonor = () => {
    if (!showDeleteDonorConfirm) return;
    const nextDonors = donorsListRaw.filter(d => d.id !== showDeleteDonorConfirm.id);
    const nextHistory = historyRaw.filter(h => h.donorId !== showDeleteDonorConfirm.id);
    onUpdateState({ donors: nextDonors, donationHistory: nextHistory });
    setShowDeleteDonorConfirm(null);
  };

  const saveDonorEdit = () => {
    if (!editingDonor) return;
    const nextDonors = donorsListRaw.map(d => d.id === editingDonor.id ? editingDonor : d);
    onUpdateState({ donors: nextDonors });
    setEditingDonor(null);
  };

  const handleExportData = () => {
    const data = {
      donors: state.donors,
      collectors: state.collectors,
      donationHistory: state.donationHistory,
      cities: state.cities,
      currentMonthKey: state.currentMonthKey,
      adminPassword: state.adminPassword,
      superAdminPassword: state.superAdminPassword
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `esaar_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onUpdateState({
          donors: json.donors || state.donors,
          collectors: json.collectors || state.collectors,
          donationHistory: json.donationHistory || state.donationHistory,
          cities: json.cities || state.cities,
          currentMonthKey: json.currentMonthKey || state.currentMonthKey,
          adminPassword: json.adminPassword || state.adminPassword,
          superAdminPassword: json.superAdminPassword || state.superAdminPassword
        });
        alert("Backup imported successfully!");
      } catch (err) {
        console.error("Import error:", err);
        alert("Error importing backup. Please ensure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  if (showAreaManagement) {
    return (
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <button onClick={() => setShowAreaManagement(false)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase text-slate-500 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex gap-2 w-full md:w-auto">
             <input type="text" className="flex-1 md:w-64 px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold" value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="New Area Name..." />
             <button onClick={() => { if(!newCity) return; onUpdateState({ cities: [...citiesRaw, newCity] }); setNewCity(''); }} className="bg-red-600 text-white p-4 rounded-2xl shadow-lg shadow-red-100"><Plus className="w-6 h-6" /></button>
          </div>
        </div>
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {citiesRaw.map((city) => (
                <div key={city} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <span className="font-black text-slate-800">{city}</span>
                   <button onClick={() => { if(window.confirm(`Are you sure you want to delete ${city}?`)) onUpdateState({ cities: citiesRaw.filter(c => c !== city) }); }} className="p-2 bg-white rounded-xl text-slate-400 hover:text-red-600 shadow-sm transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen pb-24">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2">
        <button onClick={() => setShowAreaManagement(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm" title="Area Settings"><Settings className="w-5 h-5" /></button>
        <button onClick={() => setSelectedCityFilter('All')} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${selectedCityFilter === 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}>All Areas</button>
        {citiesRaw.map(c => (
          <button key={c} onClick={() => setSelectedCityFilter(c)} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${selectedCityFilter === c ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}>{c}</button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-[22px] border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide w-full md:w-auto">
          {[
            { id: 'dashboard', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'donors', label: 'Donors', icon: <Users className="w-4 h-4" /> },
            { id: 'collectors', label: 'Agents', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'history', label: 'Status Board', icon: <History className="w-4 h-4" /> },
            ...(isSuperAdmin ? [{ id: 'maintenance', label: 'Backup', icon: <Database className="w-4 h-4" /> }] : [])
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-[18px] font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:bg-slate-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <button onClick={triggerMonthlyReset} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isResetDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg'}`}>
          {isResetDone ? `✓ ${monthName} Active` : `Generate ${monthName} List`}
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-3"><StatCard label="Monthly Target" value={`Rs. ${totalTarget.toLocaleString()}`} icon={<Building2 />} color="text-blue-600" /></div>
            <div className="lg:col-span-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm transition-all hover:translate-y-[-4px] hover:shadow-lg relative overflow-hidden flex flex-col justify-center">
               <div className="flex items-center justify-between w-full h-full">
                  <div className="flex-1">
                     <div className="p-3 rounded-2xl bg-emerald-50 inline-block mb-3 text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                     <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Collected ({monthName})</p>
                     <p className="text-4xl font-black text-slate-900 tracking-tighter">Rs. {historyTotalSum.toLocaleString()}</p>
                     <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit"><TrendingUp className="w-3 h-3" />{totalTarget > 0 ? Math.round((historyTotalSum / totalTarget) * 100) : 0}% Reached</div>
                  </div>
                  <div className="flex flex-col gap-3 ml-4">
                     <div className="bg-amber-50 p-5 rounded-[32px] border border-amber-100 min-w-[160px]"><p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">CASH</p><p className="text-2xl font-black text-slate-900">Rs. {cashSum.toLocaleString()}</p></div>
                     <div className="bg-blue-50 p-5 rounded-[32px] border border-blue-100 min-w-[160px]"><p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">BANK</p><p className="text-2xl font-black text-slate-900">Rs. {onlineSum.toLocaleString()}</p></div>
                  </div>
               </div>
            </div>
            <div className="lg:col-span-3 flex flex-col gap-3">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-center flex-1">
                 <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Current Pending</p>
                 <p className="text-2xl font-black text-red-600">Rs. {pendingAmount.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 shadow-sm flex flex-col justify-center flex-1">
                 <p className="text-red-400 text-[9px] font-black uppercase tracking-widest mb-1">Total Arrears</p>
                 <p className="text-2xl font-black text-red-700">Rs. {totalArrearsGlobal.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="xl:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-8 uppercase tracking-tight">Area Performance</h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}><XAxis dataKey="name" fontSize={10} fontWeight="900" /><YAxis fontSize={10} /><Tooltip /><Bar name="Target" dataKey="target" fill="#ef4444" radius={[8, 8, 0, 0]} /><Bar name="Collected" dataKey="collected" fill="#10b981" radius={[8, 8, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="xl:col-span-1 flex flex-col gap-6">
               <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Collection Progress</h3>
                  <div className="h-[170px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusPieData} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">{statusPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /><Legend iconType="circle" /></PieChart></ResponsiveContainer></div>
               </div>
               <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Payment Methods</h3>
                  <div className="h-[170px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentPieData} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">{paymentPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /><Legend iconType="circle" /></PieChart></ResponsiveContainer></div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'donors' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="p-8 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex-1">Donors List</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search..." className="pl-11 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
              <button onClick={() => setShowAddDonorModal(true)} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-red-100"><Plus className="w-4 h-4" /> Add Donor</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100"><th className="px-10 py-6">Information</th><th className="px-10 py-6">Agent</th><th className="px-10 py-6">Monthly Commitment</th><th className="px-10 py-6 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {donorsList.map(donor => {
                  return (
                    <tr key={donor.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-10 py-8"><div className="font-black text-slate-900">{donor.name}</div><div className="text-[10px] font-bold text-slate-400">{donor.phone} • {donor.city}</div></td>
                      <td className="px-10 py-8 text-xs font-black text-slate-700 uppercase">{collectorsRaw.find(c => c.id === donor.assignedCollectorId)?.name || 'Office'}</td>
                      <td className="px-10 py-8 font-black text-slate-600">Rs. {donor.monthlyAmount.toLocaleString()}</td>
                      <td className="px-10 py-8"><div className="flex items-center justify-center gap-2"><button onClick={() => setEditingDonor(donor)} className="p-2 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Edit2 className="w-4 h-4"/></button><button onClick={() => setSelectedDonorForLedger(donor)} className="p-2 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><FileText className="w-4 h-4"/></button><button onClick={() => setShowDeleteDonorConfirm(donor)} className="p-2 border border-slate-100 rounded-xl hover:bg-red-600 hover:text-white text-red-500"><Trash2 className="w-4 h-4"/></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'collectors' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">Agents (Collectors)</h2>
             <button onClick={() => setShowAddCollectorModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg"><UserPlus className="w-4 h-4" /> Add Agent</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100"><th className="px-10 py-6">Information</th><th className="px-10 py-6">Username</th><th className="px-10 py-6">Area</th><th className="px-10 py-6 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {collectorsRaw.map(collector => (
                  <tr key={collector.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-8"><div className="font-black text-slate-900">{collector.name}</div><div className="text-[10px] font-bold text-slate-400">{collector.phone}</div></td>
                    <td className="px-10 py-8 font-black uppercase text-xs text-slate-700">{collector.username}</td>
                    <td className="px-10 py-8 font-black text-xs text-slate-500">{collector.city || 'Global'}</td>
                    <td className="px-10 py-8"><div className="flex items-center justify-center gap-2"><button onClick={() => setEditingCollector(collector)} className="p-2 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Edit2 className="w-4 h-4"/></button><button onClick={() => setCollectorToDelete(collector)} className="p-2 border border-slate-100 rounded-xl hover:bg-red-600 hover:text-white text-red-500 transition-all"><Trash2 className="w-4 h-4"/></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1"><h2 className="text-2xl font-black text-slate-900 tracking-tight">Status Board</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{monthName} Audit</p></div>
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100"><button onClick={() => setStatusFilter('ALL')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>All</button><button onClick={() => setStatusFilter('COLLECTED')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'COLLECTED' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Paid</button><button onClick={() => setStatusFilter('PENDING')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'PENDING' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>Pending</button></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-10 py-6">Donor Name</th>
                  <th className="px-10 py-6">Arrears</th>
                  <th className="px-10 py-6">Commitment</th>
                  <th className="px-10 py-6">Status</th>
                  <th className="px-10 py-6">Received By</th>
                  <th className="px-10 py-6 text-right">Total Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comprehensiveHistory.map(row => {
                  const collectionRecord = historyRaw.find(h => h.donorId === row.id && h.date.startsWith(activeMonthKey));
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-10 py-6"><div className="font-black text-slate-900">{row.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase">{row.city}</div></td>
                      <td className="px-10 py-6"><span className="font-black text-amber-600">Rs. {Math.abs(row.arrears).toLocaleString()}</span></td>
                      <td className="px-10 py-6 font-black text-slate-600">Rs. {row.monthlyAmount.toLocaleString()}</td>
                      <td className="px-10 py-6"><div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase ${row.status === 'COLLECTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>{row.status === 'COLLECTED' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{row.status === 'COLLECTED' ? 'Paid' : 'Pending'}</div></td>
                      <td className="px-10 py-6">
                        {collectionRecord ? (
                          <div>
                            <div className="font-black text-slate-700 text-xs uppercase">{collectionRecord.collectorName}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase leading-tight">
                              {new Date(collectionRecord.date).toLocaleDateString()} {new Date(collectionRecord.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest">—</span>
                        )}
                      </td>
                      <td className={`px-10 py-6 text-right font-black text-lg ${row.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        Rs. {row.balance.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MAINTENANCE & BACKUP */}
      {activeTab === 'maintenance' && isSuperAdmin && (
        <div className="p-8 space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
             <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10"><h2 className="text-2xl font-black mb-6">Simulation</h2><button onClick={simulateNextMonth} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2"><FastForward className="w-5 h-5" /> Simulate Next Month (Testing)</button></div>
             <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10"><h2 className="text-2xl font-black mb-6">Backup</h2><button onClick={handleExportData} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2 mb-4"><Download className="w-5 h-5" /> Export Backup</button><button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2"><Upload className="w-5 h-5" /> Import Backup</button><input type="file" ref={fileInputRef} className="hidden" onChange={handleImportData} /></div>
          </div>
        </div>
      )}

      {/* MODALS: AGENT */}
      {showAddCollectorModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10">
            <h3 className="text-xl font-black mb-6 uppercase">Add New Agent</h3>
            <div className="space-y-4 mb-8">
              <InputGroup label="Name" value={newCollectorData.name} onChange={v => setNewCollectorData({...newCollectorData, name: v})} />
              <InputGroup label="Phone" value={newCollectorData.phone} onChange={v => setNewCollectorData({...newCollectorData, phone: v})} />
              <InputGroup label="Username" value={newCollectorData.username} onChange={v => setNewCollectorData({...newCollectorData, username: v})} />
              <InputGroup label="Password" value={newCollectorData.password} onChange={v => setNewCollectorData({...newCollectorData, password: v})} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { 
                const collector: User = { id: Math.random().toString(36).substr(2, 9), ...newCollectorData, role: UserRole.COLLECTOR }; 
                onUpdateState({ collectors: [...collectorsRaw, collector] }); 
                setShowAddCollectorModal(false); 
              }} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase">Add Agent</button>
              <button onClick={() => setShowAddCollectorModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingCollector && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10">
            <h3 className="text-xl font-black mb-6 uppercase">Edit Agent</h3>
            <div className="space-y-4 mb-8">
              <InputGroup label="Name" value={editingCollector.name} onChange={v => setEditingCollector({...editingCollector, name: v})} />
              <InputGroup label="Phone" value={editingCollector.phone} onChange={v => setEditingCollector({...editingCollector, phone: v})} />
              <InputGroup label="Username" value={editingCollector.username} onChange={v => setEditingCollector({...editingCollector, username: v})} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onUpdateState({ collectors: collectorsRaw.map(c => c.id === editingCollector.id ? editingCollector : c) }); setEditingCollector(null); }} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase">Save Changes</button>
              <button onClick={() => setEditingCollector(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {collectorToDelete && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-xs rounded-[40px] shadow-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="font-black mb-6">Delete Agent?</h3>
            <div className="flex flex-col gap-2">
              <button onClick={() => { onUpdateState({ collectors: collectorsRaw.filter(c => c.id !== collectorToDelete.id) }); setCollectorToDelete(null); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase">Yes, Delete</button>
              <button onClick={() => setCollectorToDelete(null)} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS: DONOR */}
      {showAddDonorModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black mb-6 uppercase">Register New Donor</h3>
            <div className="space-y-4 mb-8">
              <InputGroup label="Name" value={newDonorData.name} onChange={v => setNewDonorData({...newDonorData, name: v})} />
              <InputGroup label="Phone" value={newDonorData.phone} onChange={v => setNewDonorData({...newDonorData, phone: v})} />
              <InputGroup label="Address" value={newDonorData.address} onChange={v => setNewDonorData({...newDonorData, address: v})} />
              <InputGroup label="Monthly Amount" value={newDonorData.monthlyAmount.toString()} type="number" onChange={v => setNewDonorData({...newDonorData, monthlyAmount: parseInt(v)||0})} />
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">City</label><select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" value={newDonorData.city} onChange={e => setNewDonorData({...newDonorData, city: e.target.value})}>{citiesRaw.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Agent</label><select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" value={newDonorData.assignedCollectorId} onChange={e => setNewDonorData({...newDonorData, assignedCollectorId: e.target.value})}><option value="">Office (Self)</option>{collectorsRaw.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <button onClick={() => {
              if(!newDonorData.name || !newDonorData.phone) return alert("Required");
              const d: Donor = { id: Math.random().toString(36).substr(2, 9), ...newDonorData, assignedCollectorId: newDonorData.assignedCollectorId || null, status: 'PENDING', lastPaymentDate: null, joinDate: new Date().toISOString().split('T')[0] };
              onUpdateState({ donors: [...donorsListRaw, d] });
              setShowAddDonorModal(false);
            } } className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase">Register Donor</button>
          </div>
        </div>
      )}

      {editingDonor && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 no-print">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase">Edit Donor</h3>
              <button onClick={() => setEditingDonor(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><X/></button>
            </div>
            <div className="space-y-4 mb-8">
              <InputGroup label="Name" value={editingDonor.name} onChange={v => setEditingDonor({...editingDonor, name: v})} />
              <InputGroup label="Phone" value={editingDonor.phone} onChange={v => setEditingDonor({...editingDonor, phone: v})} />
              <InputGroup label="Address" value={editingDonor.address} onChange={v => setEditingDonor({...editingDonor, address: v})} />
              <InputGroup label="Monthly Amount" value={editingDonor.monthlyAmount.toString()} type="number" onChange={v => setEditingDonor({...editingDonor, monthlyAmount: parseInt(v)||0})} />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">City</label>
                <select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={editingDonor.city} onChange={e => setEditingDonor({...editingDonor, city: e.target.value})}>
                  {citiesRaw.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Agent</label>
                <select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={editingDonor.assignedCollectorId || ''} onChange={e => setEditingDonor({...editingDonor, assignedCollectorId: e.target.value || null})}>
                  <option value="">Office (Self)</option>
                  {collectorsRaw.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveDonorEdit} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm shadow-xl">Save Changes</button>
              <button onClick={() => setEditingDonor(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDonorConfirm && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-xs rounded-[40px] shadow-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="font-black mb-6">Delete Donor "{showDeleteDonorConfirm.name}"?</h3>
            <div className="flex flex-col gap-2">
              <button onClick={deleteDonor} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase">Yes, Delete</button>
              <button onClick={() => setShowDeleteDonorConfirm(null)} className="mt-2 w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selectedDonorForLedger && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 no-print">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black uppercase leading-tight">{selectedDonorForLedger.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Donation Ledger History</p>
              </div>
              <button onClick={() => setSelectedDonorForLedger(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {historyRaw.filter(h => h.donorId === selectedDonorForLedger.id).length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                  <RotateCcw className="w-8 h-8 text-slate-200" />
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No payment records found.</p>
                </div>
              ) : (
                historyRaw.filter(h => h.donorId === selectedDonorForLedger.id).map(h => (
                  <div key={h.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <p className="text-[10px] font-black text-slate-400 uppercase">{h.paymentMethod}</p>
                      </div>
                      <p className="font-black text-slate-900">Received by {h.collectorName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-emerald-600">Rs. {h.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
               <button onClick={() => setSelectedDonorForLedger(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Close Ledger</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm transition-all hover:translate-y-[-4px] h-full hover:shadow-lg flex flex-col justify-center">
    <div className={`p-4 rounded-[20px] bg-slate-50 inline-block mb-6 ${color} w-fit`}>{icon}</div>
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
  </div>
);

const InputGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-2 flex-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{label}</label><input type={type} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-slate-900 transition-all" value={value} onChange={e => onChange(e.target.value)} /></div>
);

export default AdminPanel;