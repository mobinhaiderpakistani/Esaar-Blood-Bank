
import React, { useState, useRef } from 'react';
import { AppState, Donor, User, UserRole, DonationRecord } from '../types';
import { 
  Users, 
  UserCheck, 
  BarChart3, 
  Plus, 
  Search,
  CheckCircle2,
  History,
  Edit2,
  Building2,
  FileText,
  Trash2,
  Settings,
  ChevronLeft,
  UserPlus,
  AlertCircle,
  Database,
  RefreshCw,
  Loader2,
  X,
  Calendar,
  Wallet,
  Globe,
  Download,
  Upload,
  Table as TableIcon,
  Save,
  ArrowLeft,
  Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface Props {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const COLORS = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

const AdminPanel: React.FC<Props> = ({ state, onUpdateState }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'donors' | 'collectors' | 'history' | 'maintenance'>('dashboard');
  const [showAreaManagement, setShowAreaManagement] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COLLECTED' | 'PENDING'>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data Explorer / Editor State
  const [selectedTable, setSelectedTable] = useState<string>('donors');
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editedData, setEditedData] = useState<any | null>(null);

  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [editingCollector, setEditingCollector] = useState<User | null>(null);
  const [selectedDonorForLedger, setSelectedDonorForLedger] = useState<Donor | null>(null);
  const [showAddDonorModal, setShowAddDonorModal] = useState(false);
  const [showAddCollectorModal, setShowAddCollectorModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = state.currentUser?.role === UserRole.SUPER_ADMIN;
  const SYSTEM_START_DATE_STR = "2026-01";
  const activeMonthKey = state.currentMonthKey || SYSTEM_START_DATE_STR;
  
  const [yearNum, monthNum] = activeMonthKey.split('-').map(Number);
  const monthName = new Date(yearNum, monthNum - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const isBaselineMonth = activeMonthKey === SYSTEM_START_DATE_STR;

  const donorsListRaw = state.donors || [];
  const historyRaw = state.donationHistory || [];
  const citiesRaw = state.cities || [];
  const collectorsRaw = state.collectors || [];

  const tables = [
    { id: 'donors', name: 'Donors', icon: <Users className="w-4 h-4" />, data: state.donors },
    { id: 'collectors', name: 'Collectors', icon: <UserCheck className="w-4 h-4" />, data: state.collectors },
    { id: 'history', name: 'Donation History', icon: <History className="w-4 h-4" />, data: state.donationHistory },
    { id: 'cities', name: 'Areas', icon: <Building2 className="w-4 h-4" />, data: state.cities },
  ];

  const getDonorBalanceMetrics = (donor: Donor) => {
    const donorJoinMonthStr = (donor.joinDate || SYSTEM_START_DATE_STR).slice(0, 7);
    const effectiveStartStr = donorJoinMonthStr > SYSTEM_START_DATE_STR ? donorJoinMonthStr : SYSTEM_START_DATE_STR;
    
    if (activeMonthKey < effectiveStartStr) return { arrears: 0, totalDue: 0, paidThisMonth: 0, currentDeficit: 0 };

    const [sYear, sMonth] = effectiveStartStr.split('-').map(Number);
    const [aYear, aMonth] = activeMonthKey.split('-').map(Number);
    const totalMonthsCount = (aYear - sYear) * 12 + (aMonth - sMonth) + 1;
    
    const donorHistory = historyRaw.filter(h => h.donorId === donor.id);
    const totalExpectedCumulative = totalMonthsCount * (donor.monthlyAmount || 0);
    const validPaidCumulative = donorHistory
      .filter(h => h.date.slice(0, 7) >= effectiveStartStr)
      .reduce((sum, h) => sum + (h.amount || 0), 0);
    
    const totalDue = Math.max(0, totalExpectedCumulative - validPaidCumulative);
    
    let arrears = 0;
    if (activeMonthKey !== SYSTEM_START_DATE_STR) {
      const monthsBeforeAudit = Math.max(0, totalMonthsCount - 1);
      const expectedBeforeAudit = monthsBeforeAudit * (donor.monthlyAmount || 0);
      const paidBeforeAudit = donorHistory
        .filter(h => h.date.slice(0, 7) >= effectiveStartStr && h.date.slice(0, 7) < activeMonthKey)
        .reduce((sum, h) => sum + (h.amount || 0), 0);
      arrears = Math.max(0, expectedBeforeAudit - paidBeforeAudit);
    }
    
    const paidThisMonth = donorHistory
      .filter(h => h.date.startsWith(activeMonthKey))
      .reduce((sum, h) => sum + (h.amount || 0), 0);

    const currentDeficit = Math.max(0, (donor.monthlyAmount || 0) - paidThisMonth);

    return { arrears, totalDue, paidThisMonth, currentDeficit };
  };

  const calculateDuration = (joinDateStr: string) => {
    if (!joinDateStr) return '0m';
    const joinDate = new Date(joinDateStr);
    const now = new Date();
    let years = now.getFullYear() - joinDate.getFullYear();
    let months = now.getMonth() - joinDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0 || (years === 0 && months === 0)) parts.push(`${months}m`);
    return parts.join(' ');
  };

  const formatDateToDMY = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return cleanDate;
  };

  const handleMasterReset = () => {
    if (window.confirm("خطرہ: تمام ادائیگیوں کا ریکارڈ مٹ جائے گا اور سسٹم دوبارہ جنوری 2026 پر سیٹ ہو جائے گا۔")) {
      setIsProcessing(true);
      onUpdateState({ donationHistory: [], currentMonthKey: SYSTEM_START_DATE_STR });
      setTimeout(() => { setIsProcessing(false); setActiveTab('dashboard'); }, 800);
    }
  };

  const handleExport = () => {
    const data = {
      donors: state.donors,
      collectors: state.collectors,
      donationHistory: state.donationHistory,
      cities: state.cities,
      currentMonthKey: state.currentMonthKey
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const now = new Date();
    const datePart = now.toISOString().split('T')[0];
    const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    link.download = `esaar_backup_${datePart}_${timePart}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (confirm("کیا آپ واقعی بیک اپ سے ڈیٹا ری سٹور کرنا چاہتے ہیں؟ موجودہ تمام ڈیٹا تبدیل ہو جائے گا۔")) {
          onUpdateState(json);
          alert("Data restored successfully!");
        }
      } catch (err) {
        alert("Invalid backup file format.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEditingRecord = (record: any) => {
    setEditingRecord(record);
    setEditedData({ ...record });
  };

  const saveRecordEdits = () => {
    if (!editedData || !editingRecord) return;
    
    let updatedList: any[] = [];
    const updateKey = selectedTable === 'donors' ? 'donors' :
                      selectedTable === 'collectors' ? 'collectors' :
                      selectedTable === 'history' ? 'donationHistory' : null;

    if (!updateKey) return;

    updatedList = (state as any)[updateKey].map((item: any) => 
      item.id === editingRecord.id ? editedData : item
    );

    onUpdateState({ [updateKey]: updatedList });
    setEditingRecord(null);
    setEditedData(null);
    alert("Record updated successfully!");
  };

  const renderEditForm = () => {
    if (!editedData) return null;
    const keys = Object.keys(editedData);

    return (
      <div className="p-8 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between mb-8">
           <button onClick={() => setEditingRecord(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-black text-[10px] uppercase tracking-wider text-slate-500 transition-all">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to List
           </button>
           <button onClick={saveRecordEdits} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg transition-all">
              <Save className="w-3.5 h-3.5" /> Save Changes
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {keys.map(key => {
            const isId = key === 'id';
            const val = editedData[key];
            const type = typeof val;

            return (
              <div key={key} className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block flex items-center gap-1">
                  {key}
                  {isId && <Info className="w-3 h-3 text-slate-300" />}
                </label>
                <input 
                  type={type === 'number' ? 'number' : 'text'}
                  disabled={isId}
                  className={`w-full px-5 py-3.5 rounded-2xl font-bold text-sm outline-none transition-all ${
                    isId ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100' : 'bg-slate-50 border border-transparent focus:bg-white focus:border-slate-200 text-slate-900'
                  }`}
                  value={val ?? ''}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    [key]: type === 'number' ? Number(e.target.value) : e.target.value
                  })}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTableData = () => {
    const activeTableData = tables.find(t => t.id === selectedTable)?.data || [];
    if (activeTableData.length === 0) {
      return <div className="flex flex-col items-center justify-center h-full text-slate-400 font-bold uppercase text-[10px] tracking-widest gap-4"><AlertCircle className="w-8 h-8 text-slate-200" /> No records found</div>;
    }

    if (selectedTable === 'cities') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
          {(activeTableData as string[]).map((city, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl font-black text-slate-700 text-xs">
              {city}
            </div>
          ))}
        </div>
      );
    }

    const keys = Object.keys(activeTableData[0]);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-20">
            <tr>
              <th className="px-6 py-4 font-black uppercase text-[9px] text-slate-400 tracking-wider">Action</th>
              {keys.map(key => (
                <th key={key} className="px-6 py-4 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeTableData.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <button 
                    onClick={() => startEditingRecord(row)}
                    className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-100 hover:shadow-sm transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
                {keys.map(key => (
                  <td key={key} className="px-6 py-4 font-medium text-slate-600 truncate max-w-[200px]">
                    {typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? 'N/A')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleNextMonth = () => {
    let nextY = yearNum;
    let nextM = monthNum + 1;
    if (nextM > 12) { nextM = 1; nextY++; }
    onUpdateState({ currentMonthKey: `${nextY}-${String(nextM).padStart(2, '0')}` });
  };

  const handlePrevMonth = () => {
    let prevY = yearNum;
    let prevM = monthNum - 1;
    if (prevM < 1) { prevM = 12; prevY--; }
    const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;
    if (prevKey >= SYSTEM_START_DATE_STR) onUpdateState({ currentMonthKey: prevKey });
  };

  const cityFiltered = selectedCityFilter === 'All' ? donorsListRaw : donorsListRaw.filter(d => d.city === selectedCityFilter);
  const donorsList = cityFiltered.filter(d => 
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.phone || '').includes(searchTerm) ||
    (d.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTarget = cityFiltered.reduce((sum, d) => sum + (d.monthlyAmount || 0), 0);
  const historyList = historyRaw.filter(h => h.date.startsWith(activeMonthKey));
  const historyTotalSum = historyList.reduce((sum, h) => sum + (h.amount || 0), 0);
  const cashSum = historyList.filter(h => h.paymentMethod === 'CASH').reduce((sum, h) => sum + h.amount, 0);
  const onlineSum = historyList.filter(h => h.paymentMethod === 'ONLINE').reduce((sum, h) => sum + h.amount, 0);
  
  const metricsMap = cityFiltered.map(d => getDonorBalanceMetrics(d));
  const totalArrearsGlobal = metricsMap.reduce((sum, m) => sum + m.arrears, 0);
  const totalCurrentDeficit = metricsMap.reduce((sum, m) => sum + m.currentDeficit, 0);

  const chartDataCities = (selectedCityFilter === 'All' ? citiesRaw : [selectedCityFilter])
    .map(city => {
      const cityDonors = donorsListRaw.filter(d => d.city === city);
      const target = cityDonors.reduce((sum, d) => sum + (d.monthlyAmount || 0), 0);
      
      const collected = historyRaw
        .filter(h => h.date.startsWith(activeMonthKey))
        .reduce((sum, h) => {
          const donor = donorsListRaw.find(d => d.id === h.donorId);
          if (donor && donor.city === city) return sum + h.amount;
          return sum;
        }, 0);
        
      return { name: city, target, collected };
    })
    .filter(cityData => cityData.target > 0);

  const pieDataStatus = [
    { name: 'Paid', value: historyList.length },
    { name: 'Pending', value: Math.max(0, cityFiltered.length - historyList.length) }
  ];

  const pieDataMethod = [
    { name: 'Cash', value: historyList.filter(h => h.paymentMethod === 'CASH').length },
    { name: 'Online', value: historyList.filter(h => h.paymentMethod === 'ONLINE').length }
  ];

  const comprehensiveHistory = cityFiltered
    .map(donor => {
      const metrics = getDonorBalanceMetrics(donor);
      const status = metrics.paidThisMonth > 0 ? 'COLLECTED' : 'PENDING';
      return { ...donor, ...metrics, status };
    })
    .filter(d => statusFilter === 'ALL' ? true : d.status === statusFilter);

  if (showAreaManagement) {
    return (
      <div className="p-8 animate-in fade-in duration-300">
        <button onClick={() => setShowAreaManagement(false)} className="flex items-center gap-2 mb-6 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase text-slate-500 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {citiesRaw.map((city) => (
                <div key={city} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <span className="font-black text-slate-800">{city}</span>
                   <button onClick={() => onUpdateState({ cities: citiesRaw.filter(c => c !== city) })} className="p-2 bg-white rounded-xl text-slate-400 hover:text-red-600 shadow-sm transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen pb-24 relative">
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
      {isProcessing && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/70 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <Loader2 className="w-16 h-16 animate-spin text-red-500 mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-[0.2em]">Processing...</h2>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide no-print">
        <button onClick={() => setShowAreaManagement(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"><Settings className="w-5 h-5" /></button>
        <button onClick={() => setSelectedCityFilter('All')} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedCityFilter === 'All' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500'}`}>All Areas</button>
        {citiesRaw.map(c => (
          <button key={c} onClick={() => setSelectedCityFilter(c)} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedCityFilter === c ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-500'}`}>{c}</button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-[22px] border border-slate-100 shadow-sm overflow-x-auto w-full md:w-auto">
          {[
            { id: 'dashboard', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'donors', label: 'Donors', icon: <Users className="w-4 h-4" /> },
            { id: 'collectors', label: 'Agents', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'history', label: 'Status Board', icon: <History className="w-4 h-4" /> },
            ...(isSuperAdmin ? [{ id: 'maintenance', label: 'Database', icon: <Database className="w-4 h-4" /> }] : [])
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-[18px] font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:bg-slate-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={handlePrevMonth} disabled={isBaselineMonth} className={`p-4 rounded-2xl font-black border transition-all ${isBaselineMonth ? 'bg-slate-50 text-slate-200 border-slate-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-900 hover:text-white'}`}>
              <ChevronLeft className="w-4 h-4" />
           </button>
           <button onClick={handleNextMonth} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {monthName} Active
           </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StatCard label="Monthly Target" value={`Rs. ${totalTarget.toLocaleString()}`} icon={<Building2 className="w-6 h-6"/>} color="text-blue-600" />
            
            <StatCard 
              label={`Collected (${monthName})`} 
              value={`Rs. ${historyTotalSum.toLocaleString()}`} 
              icon={<CheckCircle2 className="w-6 h-6"/>} 
              color="text-emerald-600"
              subStats={
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 justify-end bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 transition-all hover:shadow-md">
                    <span className="text-[11px] font-black text-amber-700">Rs. {cashSum.toLocaleString()}</span>
                    <div className="p-1 bg-white rounded-md shadow-sm">
                      <Wallet className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 transition-all hover:shadow-md">
                    <span className="text-[11px] font-black text-blue-700">Rs. {onlineSum.toLocaleString()}</span>
                    <div className="p-1 bg-white rounded-md shadow-sm">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                  </div>
                </div>
              }
            />

            <StatCard 
              label="Current Deficit" 
              value={`Rs. ${totalCurrentDeficit.toLocaleString()}`} 
              icon={<AlertCircle className="w-6 h-6"/>} 
              color="text-red-600"
              subStats={
                <div className="text-[10px] font-black text-slate-400 uppercase text-right leading-tight">
                  Total Arrears: <br/><span className="text-red-900">Rs. {totalArrearsGlobal.toLocaleString()}</span>
                </div>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col h-[500px]">
               <h3 className="text-sm font-black uppercase text-slate-400 mb-8 tracking-widest">Collection Target vs Received</h3>
               <div className="flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartDataCities} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 900, fill: '#64748b'}} dy={10} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase'}} />
                      <Bar name="Target" dataKey="target" fill="#ef4444" radius={[8, 8, 8, 8]} barSize={45} />
                      <Bar name="Collected" dataKey="collected" fill="#10b981" radius={[8, 8, 8, 8]} barSize={45} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="flex flex-col gap-6 h-[500px]">
              <div className="flex-1 bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                 <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest text-center">Status</h3>
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={pieDataStatus} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                        {pieDataStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                     </Pie>
                     <Tooltip />
                     <Legend verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '9px', fontWeight: 900, textTransform: 'uppercase'}} />
                   </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="flex-1 bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                 <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest text-center">Payment Type</h3>
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={pieDataMethod} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                        {pieDataMethod.map((_, i) => <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} />)}
                     </Pie>
                     <Tooltip />
                     <Legend verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '9px', fontWeight: 900, textTransform: 'uppercase'}} />
                   </PieChart>
                 </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'donors' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="p-8 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex-1">Donors</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search..." className="pl-11 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => setShowAddDonorModal(true)} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg"><Plus className="w-4 h-4" /> Add Donor</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-10 py-6">Donor Info</th>
                  <th className="px-10 py-6">Join Date</th>
                  <th className="px-10 py-6">Referral</th>
                  <th className="px-10 py-6">Collector</th>
                  <th className="px-10 py-6">Monthly</th>
                  <th className="px-10 py-6">Total Collected</th>
                  <th className="px-10 py-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donorsList.map(donor => {
                  const totalCollected = historyRaw
                    .filter(h => h.donorId === donor.id)
                    .reduce((sum, h) => sum + h.amount, 0);

                  return (
                    <tr key={donor.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-10 py-8">
                        <div className="font-black text-slate-900">{donor.name}</div>
                        <div className="text-[10px] font-bold text-slate-400">{donor.phone}</div>
                        <div className="text-[10px] font-bold text-blue-600 uppercase mt-0.5">{donor.city}</div>
                        <div className="text-[10px] text-slate-400 font-medium italic mt-1">{donor.address}</div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="font-black text-slate-600 text-xs">{formatDateToDMY(donor.joinDate)}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{calculateDuration(donor.joinDate)}</div>
                      </td>
                      <td className="px-10 py-8 font-bold text-xs text-slate-500">{donor.referredBy || 'Self'}</td>
                      <td className="px-10 py-8">
                        <div className="text-[10px] font-black text-slate-900 uppercase">
                          {collectorsRaw.find(c => c.id === donor.assignedCollectorId)?.name || 'Unassigned'}
                        </div>
                      </td>
                      <td className="px-10 py-8 font-black text-slate-600">Rs. {donor.monthlyAmount.toLocaleString()}</td>
                      <td className="px-10 py-8 font-black text-emerald-600">Rs. {totalCollected.toLocaleString()}</td>
                      <td className="px-10 py-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setEditingDonor(donor)} className="p-2.5 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => setSelectedDonorForLedger(donor)} className="p-2.5 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><FileText className="w-4 h-4"/></button>
                          <button onClick={() => { if(window.confirm('Delete Donor?')) onUpdateState({ donors: donorsListRaw.filter(d => d.id !== donor.id) })}} className="p-2.5 border border-slate-100 rounded-xl hover:bg-red-600 hover:text-white text-red-500 transition-all"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'collectors' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">Agents</h2>
             <button onClick={() => setShowAddCollectorModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg"><UserPlus className="w-4 h-4" /> Add Agent</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-10 py-6">Info</th>
                  <th className="px-10 py-6">Username</th>
                  <th className="px-10 py-6">Area</th>
                  <th className="px-10 py-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collectorsRaw.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{c.name}</span>
                        <span className="text-[10px] font-black text-blue-600">({donorsListRaw.filter(d => d.assignedCollectorId === c.id).length})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">{c.phone}</div>
                    </td>
                    <td className="px-10 py-8 font-black uppercase text-xs">{c.username}</td>
                    <td className="px-10 py-8 text-xs font-bold">{c.city || 'All'}</td>
                    <td className="px-10 py-8 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setEditingCollector(c)} className="p-2.5 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => { if(window.confirm('Delete Agent?')) onUpdateState({ collectors: collectorsRaw.filter(col => col.id !== c.id) })}} className="p-2.5 border border-slate-100 rounded-xl hover:bg-red-600 hover:text-white text-red-500 transition-all"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex-1">Status Board ({monthName})</h2>
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button onClick={() => setStatusFilter('ALL')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>All</button>
              <button onClick={() => setStatusFilter('COLLECTED')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'COLLECTED' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>Paid</button>
              <button onClick={() => setStatusFilter('PENDING')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'PENDING' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400'}`}>Pending</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-10 py-6">Donor</th>
                  <th className="px-10 py-6">Arrears</th>
                  <th className="px-10 py-6">Monthly</th>
                  <th className="px-10 py-6">Status</th>
                  <th className="px-10 py-6">Collector</th>
                  <th className="px-10 py-6">Mode</th>
                  <th className="px-10 py-6 text-right">Net Recievable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comprehensiveHistory.map(row => {
                  const record = historyRaw.find(h => h.donorId === row.id && h.date.startsWith(activeMonthKey));
                  const displayCollector = row.status === 'COLLECTED' ? (record?.collectorName || '---') : '---';
                  const displayMode = row.status === 'COLLECTED' ? (record?.paymentMethod || '---') : '---';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-10 py-6"><div className="font-black text-slate-900">{row.name}</div><div className="text-[10px] font-bold text-blue-600 uppercase">{row.city}</div></td>
                      <td className="px-10 py-6 font-black text-slate-400">Rs. {row.arrears.toLocaleString()}</td>
                      <td className="px-10 py-6 font-black text-slate-600">Rs. {row.monthlyAmount.toLocaleString()}</td>
                      <td className="px-10 py-6"><div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase ${row.status === 'COLLECTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{row.status}</div></td>
                      <td className="px-10 py-6 text-[10px] font-black uppercase text-slate-500">{displayCollector}</td>
                      <td className="px-10 py-6 text-[10px] font-black uppercase text-slate-500">{displayMode}</td>
                      <td className="px-10 py-6 text-right font-black text-lg">Rs. {row.totalDue.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && isSuperAdmin && (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4"><RefreshCw className="w-8 h-8 text-red-600" /></div>
                <h3 className="text-lg font-black mb-2 uppercase">Master Reset</h3>
                <p className="text-slate-400 text-[10px] mb-6 font-bold uppercase">Reset all collections to Jan 2026</p>
                <button onClick={handleMasterReset} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg mt-auto">Reset System</button>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4"><Download className="w-8 h-8 text-blue-600" /></div>
                <h3 className="text-lg font-black mb-2 uppercase">Backup Data</h3>
                <p className="text-slate-400 text-[10px] mb-6 font-bold uppercase">Download everything as JSON file</p>
                <button onClick={handleExport} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-lg mt-auto">Export Backup</button>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4"><Upload className="w-8 h-8 text-emerald-600" /></div>
                <h3 className="text-lg font-black mb-2 uppercase">Restore Data</h3>
                <p className="text-slate-400 text-[10px] mb-6 font-bold uppercase">Upload JSON file to restore</p>
                <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg mt-auto">Import Backup</button>
              </div>
           </div>

           <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
              <div className="p-8 border-b border-slate-100 flex items-center gap-4">
                 <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><TableIcon className="w-6 h-6" /></div>
                 <div className="flex-1">
                    <h3 className="text-xl font-black uppercase">Live Data Editor</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select, view, and manually edit records</p>
                 </div>
                 {editingRecord && (
                    <div className="flex items-center gap-2 animate-in fade-in zoom-in">
                       <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-lg">Manual Edit Mode</span>
                    </div>
                 )}
              </div>
              <div className="flex-1 flex overflow-hidden">
                 {/* Left Sidebar: Table List */}
                 <div className="w-64 border-r border-slate-100 bg-slate-50/50 flex flex-col p-4 gap-2 overflow-y-auto">
                    {tables.map(table => (
                       <button
                          key={table.id}
                          onClick={() => { setSelectedTable(table.id); setEditingRecord(null); }}
                          className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-wider ${
                             selectedTable === table.id 
                                ? 'bg-slate-900 text-white shadow-xl translate-x-1' 
                                : 'bg-white text-slate-400 hover:bg-slate-100'
                          }`}
                       >
                          {table.icon}
                          <span className="flex-1 text-left">{table.name}</span>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full ${selectedTable === table.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                             {Array.isArray(table.data) ? table.data.length : 0}
                          </span>
                       </button>
                    ))}
                 </div>

                 {/* Right Side: Data View or Edit Form */}
                 <div className="flex-1 bg-white overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-sm z-10">
                       <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">
                          {editingRecord ? `Editing Entry: ${editingRecord.name || editingRecord.id}` : `Viewing Table: ${tables.find(t => t.id === selectedTable)?.name}`}
                       </h4>
                       <div className="text-[9px] font-black text-emerald-500 flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          LIVE CONNECTION
                       </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                       {editingRecord ? renderEditForm() : renderTableData()}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modals */}
      {editingDonor && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black uppercase">Edit Donor</h3><button onClick={() => setEditingDonor(null)}><X className="w-6 h-6 text-slate-300 hover:text-red-500"/></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <InputGroup label="Name" value={editingDonor.name} onChange={v => setEditingDonor({...editingDonor, name: v})} />
              <InputGroup label="Phone" value={editingDonor.phone} onChange={v => setEditingDonor({...editingDonor, phone: v})} />
              <div className="md:col-span-2"><InputGroup label="Address" value={editingDonor.address} onChange={v => setEditingDonor({...editingDonor, address: v})} /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">City</label><select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" value={editingDonor.city} onChange={e => setEditingDonor({...editingDonor, city: e.target.value})}>{citiesRaw.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <InputGroup label="Monthly" value={editingDonor.monthlyAmount.toString()} type="number" onChange={v => setEditingDonor({...editingDonor, monthlyAmount: Number(v)})} />
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Collector</label><select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" value={editingDonor.assignedCollectorId || ''} onChange={e => setEditingDonor({...editingDonor, assignedCollectorId: e.target.value})}><option value="">Unassigned</option>{collectorsRaw.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <button onClick={() => { onUpdateState({ donors: donorsListRaw.map(d => d.id === editingDonor.id ? editingDonor : d) }); setEditingDonor(null); }} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase shadow-lg">Save Changes</button>
          </div>
        </div>
      )}

      {editingCollector && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-lg rounded-[40px] shadow-2xl p-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase">Edit Agent</h3>
              <button onClick={() => setEditingCollector(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-300 hover:text-red-500"/></button>
            </div>
            <div className="space-y-4 mb-8">
              <InputGroup label="Name" value={editingCollector.name} onChange={v => setEditingCollector({...editingCollector, name: v})} />
              <InputGroup label="Phone" value={editingCollector.phone} onChange={v => setEditingCollector({...editingCollector, phone: v})} />
              <InputGroup label="Username" value={editingCollector.username} onChange={v => setEditingCollector({...editingCollector, username: v})} />
              <InputGroup label="Password" value={editingCollector.password || ''} onChange={v => setEditingCollector({...editingCollector, password: v})} />
            </div>
            <button onClick={() => { onUpdateState({ collectors: collectorsRaw.map(c => c.id === editingCollector.id ? editingCollector : c) }); setEditingCollector(null); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-xl">Update Profile</button>
          </div>
        </div>
      )}

      {selectedDonorForLedger && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-10 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-black uppercase">{selectedDonorForLedger.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Ledger</p></div><button onClick={() => setSelectedDonorForLedger(null)}><X className="w-6 h-6 text-slate-300 hover:text-red-500"/></button></div>
            <div className="overflow-y-auto flex-1 space-y-3 pr-2 custom-scrollbar">
              {historyRaw.filter(h => h.donorId === selectedDonorForLedger.id).length === 0 ? (
                <div className="py-20 text-center"><AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-bold uppercase text-xs">No records</p></div>
              ) : (
                historyRaw.filter(h => h.donorId === selectedDonorForLedger.id).map(h => (
                  <div key={h.id} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                    <div><p className="text-xs font-black text-slate-900">{new Date(h.date).toLocaleDateString()}</p><p className="text-[9px] text-slate-400 font-bold uppercase">{h.paymentMethod} • Collector: {h.collectorName}</p></div>
                    <p className="font-black text-emerald-600">Rs. {h.amount.toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color, subStats }: any) => (
  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-full flex flex-col justify-center hover:shadow-lg transition-all relative group">
    <div className={`p-4 rounded-[20px] bg-slate-50 inline-block mb-6 ${color} w-fit transition-transform group-hover:scale-110`}>{icon}</div>
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <div className="flex justify-between items-center gap-4">
      <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
      {subStats && <div className="text-right">{subStats}</div>}
    </div>
  </div>
);

const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-2 flex-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{label}</label>
    <input type={type} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-slate-100 transition-all" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default AdminPanel;
