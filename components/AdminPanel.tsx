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
  TrendingUp
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
  
  // Custom Modal States
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showDeleteDonorConfirm, setShowDeleteDonorConfirm] = useState<Donor | null>(null);
  const [showDeleteAreaConfirm, setShowDeleteAreaConfirm] = useState<string | null>(null);
  
  const [selectedDonorForLedger, setSelectedDonorForLedger] = useState<Donor | null>(null);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [editingCollector, setEditingCollector] = useState<User | null>(null);
  const [collectorToDelete, setCollectorToDelete] = useState<User | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCity, setNewCity] = useState('');

  const isSuperAdmin = state.currentUser?.role === UserRole.SUPER_ADMIN;

  const [localCheckpoints, setLocalCheckpoints] = useState<{id: string, timestamp: string, data: any}[]>(() => {
    try {
      const saved = localStorage.getItem('esaar_checkpoints');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

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
    password: '1234',
    city: state.cities[0] || ''
  });

  const today = new Date();
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });
  const monthKey = today.toISOString().slice(0, 7); 
  const isResetDone = state.currentMonthKey === monthKey;

  const triggerMonthlyReset = () => {
    if (isResetDone) return;
    if (window.confirm(`Are you sure you want to reset all donor statuses to PENDING for ${monthName}?`)) {
      const resetDonors = (state.donors || []).map(d => ({ ...d, status: 'PENDING' as const }));
      onUpdateState({ donors: resetDonors, currentMonthKey: monthKey });
    }
  };

  const donorsListRaw = state.donors || [];
  const historyRaw = state.donationHistory || [];
  const citiesRaw = state.cities || [];
  const collectorsRaw = state.collectors || [];

  const cityFiltered = selectedCityFilter === 'All' ? donorsListRaw : donorsListRaw.filter(d => d.city === selectedCityFilter);
  const donorsList = cityFiltered.filter(d => {
    const matchesSearch = (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.phone || '').includes(searchTerm);
    return matchesSearch;
  });

  // Precise Calculation Logic
  const totalTarget = cityFiltered.reduce((sum, d) => sum + (d.monthlyAmount || 0), 0);
  
  const historyList = historyRaw
    .filter(h => !state.currentMonthKey || h.date.startsWith(state.currentMonthKey))
    .filter(h => {
      if (selectedCityFilter === 'All') return true;
      const d = donorsListRaw.find(donor => donor.id === h.donorId);
      return d && d.city === selectedCityFilter;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const historyTotalSum = historyList.reduce((sum, h) => sum + (h.amount || 0), 0);
  const cashSum = historyList.filter(h => h.paymentMethod === 'CASH').reduce((sum, h) => sum + (h.amount || 0), 0);
  const onlineSum = historyList.filter(h => h.paymentMethod === 'ONLINE').reduce((sum, h) => sum + (h.amount || 0), 0);
  const pendingAmount = totalTarget - historyTotalSum;

  const totalCollectedCount = cityFiltered.filter(d => d.status === 'COLLECTED').length;
  const totalPendingCount = cityFiltered.filter(d => d.status === 'PENDING').length;

  const comprehensiveHistory = cityFiltered
    .filter(d => statusFilter === 'ALL' ? true : d.status === statusFilter)
    .map(donor => {
      const paymentRecord = historyList.find(h => h.donorId === donor.id);
      return { ...donor, paymentDetails: paymentRecord || null };
    })
    .sort((a, b) => {
      if (a.status === b.status) return a.name.localeCompare(b.name);
      return a.status === 'COLLECTED' ? -1 : 1;
    });

  const barData = citiesRaw.map(c => ({
    name: c,
    target: donorsListRaw.filter(d => d.city === c).reduce((s, d) => s + (d.monthlyAmount || 0), 0),
    collected: historyList.filter(h => {
      const d = donorsListRaw.find(donor => donor.id === h.donorId);
      return d && d.city === c;
    }).reduce((s, h) => s + (h.amount || 0), 0)
  })).filter(x => x.target > 0);

  const statusPieData = [
    { name: 'Collected', value: totalCollectedCount, color: '#10b981' },
    { name: 'Pending', value: totalPendingCount, color: '#ef4444' }
  ];

  const paymentPieData = [
    { name: 'Cash', value: cashSum, color: '#f59e0b' },
    { name: 'Online', value: onlineSum, color: '#3b82f6' }
  ];

  const createQuickCheckpoint = () => {
    const newCheckpoint = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      data: JSON.parse(JSON.stringify(state))
    };
    const updated = [newCheckpoint, ...localCheckpoints].slice(0, 10);
    setLocalCheckpoints(updated);
    localStorage.setItem('esaar_checkpoints', JSON.stringify(updated));
    alert("چیک پوائنٹ محفوظ ہو گیا۔");
  };

  const restoreQuickCheckpoint = (checkpoint: any) => {
    if (window.confirm("Restore this checkpoint?")) {
      onUpdateState(checkpoint.data);
    }
  };

  const deleteCheckpoint = (id: string) => {
    const updated = localCheckpoints.filter(c => c.id !== id);
    setLocalCheckpoints(updated);
    localStorage.setItem('esaar_checkpoints', JSON.stringify(updated));
  };

  const handleExportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `esaar_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        onUpdateState(json);
        alert("ڈیٹا بحال ہو گیا۔");
      } catch (err) { alert("Invalid file."); }
    };
    reader.readAsText(file);
  };

  const executeAgentDeletion = () => {
    if (!collectorToDelete) return;
    const id = collectorToDelete.id;
    const nextCollectors = collectorsRaw.filter(c => c.id !== id);
    const nextDonors = donorsListRaw.map(d => d.assignedCollectorId === id ? { ...d, assignedCollectorId: null } : d);
    onUpdateState({ collectors: nextCollectors, donors: nextDonors });
    setCollectorToDelete(null);
  };

  const handlePerformDeepReset = () => {
    if (!isSuperAdmin) return;
    setIsResetting(true);
    setShowResetConfirmModal(false);

    try {
      const resetDonors = (state.donors || []).map(donor => ({
        ...donor,
        status: 'PENDING' as const,
        lastPaymentDate: null
      }));

      onUpdateState({
        donationHistory: [],
        donors: resetDonors,
        currentMonthKey: ""
      });

      setTimeout(() => {
        setIsResetting(false);
        setActiveTab('dashboard');
        alert("سسٹم کامیابی سے ری سیٹ کر دیا گیا ہے۔");
      }, 1000);
    } catch (err) {
      setIsResetting(false);
      alert("Error during reset.");
    }
  };

  const handleWhatsAppShare = () => {
    const header = `*ESAAR BLOOD BANK - ${monthName} STATUS*\nArea: *${selectedCityFilter}*\n---------------------------\n`;
    const summary = `Paid: *${totalCollectedCount}*\nPending: *${totalPendingCount}*\nTotal Collection: *Rs. ${historyTotalSum.toLocaleString()}*\n---------------------------\n`;
    
    let donorLines = comprehensiveHistory.map((row, index) => {
      const statusIcon = row.status === 'COLLECTED' ? '✅' : '❌';
      return `${index + 1}. ${statusIcon} *${row.name}* - Rs. ${row.monthlyAmount.toLocaleString()}`;
    }).join('\n');
    
    if (comprehensiveHistory.length === 0) donorLines = "_No records found._";
    
    const message = header + summary + `*DETAILS:*\n` + donorLines;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert("Please allow pop-ups to print the report.");
      return;
    }

    const rowsHtml = comprehensiveHistory.map((row, idx) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px; text-align: center;">${idx + 1}</td>
        <td style="padding: 12px;"><strong>${row.name}</strong><br><small style="color: #666;">${row.phone}</small></td>
        <td style="padding: 12px; font-size: 11px; text-transform: uppercase;">${collectorsRaw.find(c => c.id === row.assignedCollectorId)?.name || 'Office'}</td>
        <td style="padding: 12px; font-weight: bold; color: ${row.status === 'COLLECTED' ? '#10b981' : '#ef4444'}; text-transform: uppercase; font-size: 11px;">${row.status}</td>
        <td style="padding: 12px; text-align: right; font-weight: bold;">Rs. ${row.monthlyAmount.toLocaleString()}</td>
      </tr>
    `).join('');

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Esaar Blood Bank Report - ${monthName}</title>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 40px; color: #1e293b; background: #fff; }
          .header { text-align: center; border-bottom: 4px double #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 32px; letter-spacing: -1px; text-transform: uppercase; }
          .header p { margin: 5px 0; font-weight: bold; font-size: 14px; color: #64748b; letter-spacing: 2px; }
          .summary { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; }
          .summary-box { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .main-table { width: 100%; border-collapse: collapse; margin-bottom: 50px; }
          .main-table th { background: #1e293b; color: #fff; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
          .footer { margin-top: 80px; display: flex; justify-content: space-around; }
          .sig-box { border-top: 1px solid #cbd5e1; width: 200px; text-align: center; padding-top: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Esaar Blood Bank</h1>
          <p>Monthly Donation Audit Report</p>
        </div>

        <div class="summary">
          <div class="summary-box">
            <strong>Area:</strong> ${selectedCityFilter}<br>
            <strong>Month:</strong> ${monthName}<br>
            <strong>Date:</strong> ${new Date().toLocaleDateString()}
          </div>
          <div class="summary-box" style="text-align: right;">
            <strong>Total Donors:</strong> ${comprehensiveHistory.length}<br>
            <span style="font-size: 18px; color: #10b981; font-weight: 900;">Collected: Rs. ${historyTotalSum.toLocaleString()}</span>
          </div>
        </div>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">S#</th>
              <th>Donor Name & Contact</th>
              <th>Assigned Agent</th>
              <th>Status</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-box">Auditor Signature</div>
          <div class="sig-box">Manager Stamp</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 750);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
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
           <div className="mb-10 flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-2xl"><MapPin className="w-8 h-8 text-red-600" /></div>
              <div>
                 <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Organization Areas</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage Collection Territories</p>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {citiesRaw.map((city) => (
                <div key={city} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <span className="font-black text-slate-800">{city}</span>
                   <button onClick={() => setShowDeleteAreaConfirm(city)} className="p-2 bg-white rounded-xl text-slate-400 hover:text-red-600 shadow-sm transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
           </div>
        </div>
        {showDeleteAreaConfirm && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4">
            <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
              <h3 className="text-xl font-black text-slate-900 mb-4">ایریا ڈیلیٹ کریں؟</h3>
              <p className="text-sm text-slate-500 mb-8 font-bold">کیا آپ واقعی "{showDeleteAreaConfirm}" کو ڈیلیٹ کرنا چاہتے ہیں؟</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => { onUpdateState({ cities: citiesRaw.filter(c => c !== showDeleteAreaConfirm) }); setShowDeleteAreaConfirm(null); }} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs">ہاں، ڈیلیٹ کریں</button>
                <button onClick={() => setShowDeleteAreaConfirm(null)} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs">منسوخ</button>
              </div>
            </div>
          </div>
        )}
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
            ...(isSuperAdmin ? [{ id: 'maintenance', label: 'System Backup', icon: <Database className="w-4 h-4" /> }] : [])
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-[18px] font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:bg-slate-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <button onClick={triggerMonthlyReset} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isResetDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg'}`}>{isResetDone ? `✓ ${monthName} Active` : `Generate ${monthName} List`}</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-3">
              <StatCard label="Monthly Target" value={`Rs. ${totalTarget.toLocaleString()}`} icon={<Building2 />} color="text-blue-600" />
            </div>
            
            <div className="lg:col-span-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm transition-all hover:translate-y-[-4px] hover:shadow-lg relative overflow-hidden flex flex-col justify-center">
               <div className="flex items-center justify-between w-full h-full">
                  <div className="flex-1">
                     <div className="p-3 rounded-2xl bg-emerald-50 inline-block mb-3 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                     </div>
                     <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Collected</p>
                     <p className="text-4xl font-black text-slate-900 tracking-tighter">Rs. {historyTotalSum.toLocaleString()}</p>
                     
                     <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit">
                        <TrendingUp className="w-3 h-3" />
                        {totalTarget > 0 ? Math.round((historyTotalSum / totalTarget) * 100) : 0}% of Target Reached
                     </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 ml-4">
                     <div className="bg-amber-50 p-5 rounded-[32px] border border-amber-100 group transition-all hover:bg-amber-100 min-w-[160px]">
                        <div className="flex items-center justify-between mb-2">
                          <Wallet className="w-5 h-5 text-amber-600" />
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">CASH</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">Rs. {cashSum.toLocaleString()}</p>
                     </div>
                     <div className="bg-blue-50 p-5 rounded-[32px] border border-blue-100 group transition-all hover:bg-blue-100 min-w-[160px]">
                        <div className="flex items-center justify-between mb-2">
                          <Globe className="w-5 h-5 text-blue-600" />
                          <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">BANK</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">Rs. {onlineSum.toLocaleString()}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-3">
              <StatCard label="Pending Amount" value={`Rs. ${pendingAmount.toLocaleString()}`} icon={<Clock />} color="text-red-600" />
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="xl:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-8 uppercase tracking-tight">Area Performance Overview</h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barGap={0}>
                    <XAxis dataKey="name" fontSize={10} fontWeight="900" />
                    <YAxis fontSize={10} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                    <Bar name="Target" dataKey="target" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    <Bar name="Collected" dataKey="collected" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="xl:col-span-1 flex flex-col gap-6">
               <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Collection Progress</h3>
                  <div className="h-[170px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusPieData} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                          {statusPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Payment Methods</h3>
                  <div className="h-[170px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentPieData} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                          {paymentPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
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
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search..." className="pl-11 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => setShowAddDonorModal(true)} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-red-100"><Plus className="w-4 h-4" /> Add Donor</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100"><th className="px-10 py-6">Information</th><th className="px-10 py-6">Agent</th><th className="px-10 py-6">Amount</th><th className="px-10 py-6 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {donorsList.map(donor => (
                  <tr key={donor.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-8">
                       <div className="font-black text-slate-900">{donor.name}</div>
                       <div className="text-[10px] font-bold text-slate-400">{donor.phone} • {donor.city}</div>
                       <div className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-1 truncate max-w-[200px]">{donor.address} • Ref: {donor.referredBy || 'Direct'}</div>
                    </td>
                    <td className="px-10 py-8 text-xs font-black text-slate-700 uppercase">{collectorsRaw.find(c => c.id === donor.assignedCollectorId)?.name || 'Office'}</td>
                    <td className="px-10 py-8 font-black text-slate-900">Rs. {donor.monthlyAmount.toLocaleString()}</td>
                    <td className="px-10 py-8">
                       <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setEditingDonor(donor)} className="p-2 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedDonorForLedger(donor); }} className="p-2 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><FileText className="w-4 h-4"/></button>
                          <button onClick={() => setShowDeleteDonorConfirm(donor)} className="p-2 border border-slate-100 rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-red-500"><Trash2 className="w-4 h-4"/></button>
                       </div>
                    </td>
                  </tr>
                ))}
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
              <thead><tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100"><th className="px-10 py-6">Information</th><th className="px-10 py-6">Account</th><th className="px-10 py-6">Territory</th><th className="px-10 py-6 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {collectorsRaw.map(collector => {
                  const assignedDonorsCount = donorsListRaw.filter(d => d.assignedCollectorId === collector.id).length;
                  return (
                    <tr key={collector.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-10 py-8">
                        <div className="font-black text-slate-900">
                          {collector.name}
                          <span className="text-[10px] font-bold text-red-600">&nbsp;&nbsp;({assignedDonorsCount})</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">{collector.phone}</div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="text-xs font-black text-slate-700 uppercase">{collector.username}</div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-[9px] font-black uppercase text-slate-600">{collector.city || 'Global'}</span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setEditingCollector(collector)} className="p-2 border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Edit2 className="w-4 h-4"/></button>
                          <button 
                            type="button"
                            onClick={() => setCollectorToDelete(collector)} 
                            className="p-3 border border-slate-200 rounded-xl bg-white hover:bg-red-600 hover:text-white transition-all text-red-500 shadow-sm"
                          >
                            <Trash2 className="w-5 h-5"/>
                          </button>
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

      {activeTab === 'history' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Collection Status Board</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Audit for {monthName} in {selectedCityFilter}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 mr-2">
                <button onClick={handleWhatsAppShare} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Share on WhatsApp"><MessageCircle className="w-5 h-5" /></button>
                <button onClick={handlePrintReport} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95" title="Print Professional Report"><Printer className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                 <button onClick={() => setStatusFilter('ALL')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>All</button>
                 <button onClick={() => setStatusFilter('COLLECTED')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'COLLECTED' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>Paid</button>
                 <button onClick={() => setStatusFilter('PENDING')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'PENDING' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>Pending</button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100"><th className="px-10 py-6">Donor Info</th><th className="px-10 py-6">Assigned Agent</th><th className="px-10 py-6">Status</th><th className="px-10 py-6">Payment History</th><th className="px-10 py-6 text-right">Monthly Amount</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {comprehensiveHistory.map(row => (
                  <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${row.status === 'PENDING' ? 'bg-red-50/20' : ''}`}>
                    <td className="px-10 py-6"><div className="font-black text-slate-900">{row.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.city}</div></td>
                    <td className="px-10 py-6"><div className="font-black text-slate-700 text-xs uppercase">{collectorsRaw.find(c => c.id === row.assignedCollectorId)?.name || 'Office (Self)'}</div></td>
                    <td className="px-10 py-6"><div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${row.status === 'COLLECTED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200 animate-pulse'}`}>{row.status === 'COLLECTED' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{row.status === 'COLLECTED' ? 'Paid' : 'Pending'}</div></td>
                    <td className="px-10 py-6">{row.paymentDetails ? (<div><div className="text-xs font-bold text-slate-900">{row.paymentDetails.paymentMethod}</div><div className="text-[9px] font-bold text-slate-400 uppercase">{new Date(row.paymentDetails.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div></div>) : (<div className="text-[9px] font-black text-slate-300 uppercase italic">Awaiting Payment</div>)}</td>
                    <td className={`px-10 py-6 text-right font-black text-lg ${row.status === 'COLLECTED' ? 'text-emerald-600' : 'text-slate-400'}`}>Rs. {(row.monthlyAmount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white"><tr className="font-black"><td colSpan={4} className="px-10 py-10 uppercase tracking-widest text-[11px]">Total Area Collection (Paid Only)</td><td className="px-10 py-10 text-right text-3xl text-emerald-400">Rs. {historyTotalSum.toLocaleString()}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && isSuperAdmin && (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10">
               <div className="mb-10 flex items-center gap-4">
                  <div className="p-3 bg-slate-900 rounded-2xl"><Database className="w-8 h-8 text-white" /></div>
                  <div>
                     <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Data Backup</h2>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Permanent File Export/Import</p>
                  </div>
               </div>
               <div className="space-y-6">
                  <div className="p-8 bg-emerald-50 rounded-[32px] border border-emerald-100">
                     <Download className="w-6 h-6 text-emerald-600 mb-4" />
                     <h3 className="text-lg font-black text-emerald-900 uppercase">Export File</h3>
                     <p className="text-sm text-emerald-700/80 mb-6 font-medium">موجودہ تمام ڈیٹا کا بیک اپ فائل ڈاؤن لوڈ کریں۔</p>
                     <button onClick={handleExportData} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100">بیک اپ ڈاؤن لوڈ کریں</button>
                  </div>
                  <div className="p-8 bg-blue-50 rounded-[32px] border border-blue-100">
                     <Upload className="w-6 h-6 text-blue-600 mb-4" />
                     <h3 className="text-lg font-black text-blue-900 uppercase">Import File</h3>
                     <p className="text-sm text-blue-700/80 mb-6 font-medium">پہلے سے ڈاؤن لوڈ کردہ بیک اپ فائل اپ لوڈ کریں۔</p>
                     <input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" accept=".json" />
                     <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100">بیک اپ فائل اپ لوڈ کریں</button>
                  </div>
               </div>
               <div className="mt-12 pt-8 border-t border-red-50">
                 <div className="flex items-center gap-4 mb-6">
                   <Trash className="w-6 h-6 text-red-600" />
                   <h3 className="text-lg font-black text-red-600 uppercase">Danger Zone</h3>
                 </div>
                 <div className="p-8 bg-red-50 rounded-[32px] border border-red-100">
                   <h4 className="font-black text-red-900 mb-2">Deep System Reset</h4>
                   <p className="text-sm text-red-700/80 mb-6 font-medium leading-relaxed">تمام ٹرانزیکشن ہسٹری ڈیلیٹ کر دیں اور کلیکشن دوبارہ شروع کریں۔</p>
                   <button 
                    type="button"
                    disabled={isResetting}
                    onClick={() => setShowResetConfirmModal(true)} 
                    className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${isResetting ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'}`}
                   >
                     <AlertCircle className="w-4 h-4" /> {isResetting ? 'ری سیٹ ہو رہا ہے...' : 'کلین سویپ ری سیٹ کریں'}
                   </button>
                 </div>
               </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10">
               <div className="mb-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-600 rounded-2xl"><BookmarkCheck className="w-8 h-8 text-white" /></div>
                    <div>
                       <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Checkpoints</h2>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fast Local Restore Points</p>
                    </div>
                  </div>
                  <button onClick={createQuickCheckpoint} className="p-4 bg-red-600 text-white rounded-2xl shadow-lg hover:bg-red-700 transition-all">
                    <Plus className="w-6 h-6" />
                  </button>
               </div>
               <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {localCheckpoints.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                      <BookmarkCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="font-black text-slate-300 uppercase tracking-widest">No checkpoints created</p>
                    </div>
                  ) : (
                    localCheckpoints.map((checkpoint) => (
                      <div key={checkpoint.id} className="p-6 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                        <div>
                          <p className="font-black text-slate-900">{checkpoint.timestamp}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Local Browser Snapshot</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => restoreQuickCheckpoint(checkpoint)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all">
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                          <button onClick={() => deleteCheckpoint(checkpoint.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          {showResetConfirmModal && (
            <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4">
              <div className="bg-white w-full max-sm rounded-[40px] shadow-2xl overflow-hidden text-center animate-in zoom-in duration-300">
                <div className="p-10">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-4">آخری تصدیق!</h3>
                  <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8">
                    کیا آپ واقعی تمام ریکارڈ ڈیلیٹ کرنا چاہتے ہیں؟ تمام ڈونرز دوبارہ 'Pending' ہو جائیں گے۔
                  </p>
                  <div className="flex flex-col gap-3">
                    <button onClick={handlePerformDeepReset} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all">ہاں، سب کچھ ڈیلیٹ کریں</button>
                    <button onClick={() => setShowResetConfirmModal(false)} className="w-full py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-xs">منسوخ</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showDeleteDonorConfirm && (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center">
            <Trash2 className="w-16 h-16 text-red-600 mx-auto mb-6" />
            <h3 className="text-xl font-black text-slate-900 mb-4">ڈونر ڈیلیٹ کریں؟</h3>
            <p className="text-sm text-slate-500 mb-8 font-bold">کیا آپ واقعی "{showDeleteDonorConfirm.name}" کو ڈیلیٹ کرنا چاہتے ہیں؟</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { onUpdateState({ donors: donorsListRaw.filter(d => d.id !== showDeleteDonorConfirm.id) }); setShowDeleteDonorConfirm(null); }} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs">ہاں، ڈیلیٹ کریں</button>
              <button onClick={() => setShowDeleteDonorConfirm(null)} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs">منسوخ</button>
            </div>
          </div>
        </div>
      )}

      {editingDonor && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 overflow-y-auto max-h-[90vh] relative animate-in slide-in-from-bottom-5">
            <button onClick={() => setEditingDonor(null)} className="absolute right-8 top-8 p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-8 h-8 text-slate-300"/></button>
            <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tight">Update Donor Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               <InputGroup label="Name" value={editingDonor.name} onChange={v => setEditingDonor({...editingDonor, name: v})} />
               <InputGroup label="Phone" value={editingDonor.phone} onChange={v => setEditingDonor({...editingDonor, phone: v})} />
               <InputGroup label="Address" value={editingDonor.address} onChange={v => setEditingDonor({...editingDonor, address: v})} />
               <InputGroup label="Monthly Amount" value={editingDonor.monthlyAmount.toString()} type="number" onChange={v => setEditingDonor({...editingDonor, monthlyAmount: parseInt(v) || 0})} />
               <InputGroup label="Referred By" value={editingDonor.referredBy || ''} onChange={v => setEditingDonor({...editingDonor, referredBy: v})} />
               <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">City</label><select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={editingDonor.city} onChange={e => setEditingDonor({...editingDonor, city: e.target.value})}>{citiesRaw.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
               <div className="space-y-2 col-span-1 md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Assigned Agent</label><select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={editingDonor.assignedCollectorId || ''} onChange={e => setEditingDonor({...editingDonor, assignedCollectorId: e.target.value || null})}><option value="">Office (Self)</option>{collectorsRaw.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <button onClick={() => { onUpdateState({ donors: donorsListRaw.map(d => d.id === editingDonor.id ? editingDonor : d) }); setEditingDonor(null); }} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase shadow-2xl flex items-center justify-center gap-3"><Save className="w-6 h-6"/> Save Changes</button>
          </div>
        </div>
      )}

      {editingCollector && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 relative animate-in zoom-in duration-300">
            <button onClick={() => setEditingCollector(null)} className="absolute right-8 top-8 p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            <h3 className="text-xl font-black text-slate-900 uppercase mb-8">Edit Agent Profile</h3>
            <div className="space-y-4 mb-8">
              <InputGroup label="Agent Name" value={editingCollector.name} onChange={v => setEditingCollector({...editingCollector, name: v})} />
              <InputGroup label="Phone" value={editingCollector.phone} onChange={v => setEditingCollector({...editingCollector, phone: v})} />
              <InputGroup label="Username" value={editingCollector.username} onChange={v => setEditingCollector({...editingCollector, username: v})} />
              <InputGroup label="Password" value={editingCollector.password || ''} onChange={v => setEditingCollector({...editingCollector, password: v})} />
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Territory</label><select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={editingCollector.city || ''} onChange={e => setEditingCollector({...editingCollector, city: e.target.value})}>{citiesRaw.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <button onClick={() => { onUpdateState({ collectors: collectorsRaw.map(c => c.id === editingCollector.id ? editingCollector : c) }); setEditingCollector(null); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-xl">Update Account</button>
          </div>
        </div>
      )}

      {collectorToDelete && (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle className="w-10 h-10 text-red-600" /></div>
            <h3 className="text-xl font-black text-slate-900 mb-4">ایجنٹ ڈیلیٹ کریں؟</h3>
            <p className="text-sm font-bold text-slate-400 mb-8">ایجنٹ "{collectorToDelete.name}" کو ڈیلیٹ کرنے کے بعد اس کے تمام ڈونرز "Office" کو منتقل ہو جائیں گے۔</p>
            <div className="flex flex-col gap-3">
              <button onClick={executeAgentDeletion} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs">ڈیلیٹ کریں</button>
              <button onClick={() => setCollectorToDelete(null)} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs">منسوخ</button>
            </div>
          </div>
        </div>
      )}

      {selectedDonorForLedger && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-10">
              <div><h2 className="text-3xl font-black text-slate-900">{selectedDonorForLedger.name}</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction History Summary</p></div>
              <button onClick={() => setSelectedDonorForLedger(null)} className="p-3 hover:bg-slate-100 rounded-full transition-colors"><X className="w-8 h-8 text-slate-400"/></button>
            </div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-4">
              {historyRaw.filter(h => h.donorId === selectedDonorForLedger.id).length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="font-black text-slate-300 uppercase tracking-widest">No transactions found</p>
                </div>
              ) : (
                historyRaw.filter(h => h.donorId === selectedDonorForLedger.id).map(h => (
                  <div key={h.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                    <div><p className="font-black text-slate-800 text-lg">{new Date(h.date).toLocaleDateString('en-GB')}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{h.paymentMethod} • Received by {h.collectorName}</p></div>
                    <p className="font-black text-emerald-600 text-2xl">Rs. {h.amount.toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center"><span className="text-[11px] font-black text-slate-400 uppercase">Total Lifetime Contribution</span><span className="text-2xl font-black text-slate-900">Rs. {historyRaw.filter(h => h.donorId === selectedDonorForLedger.id).reduce((s, h) => s + (h.amount || 0), 0).toLocaleString()}</span></div>
          </div>
        </div>
      )}

      {showAddDonorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto relative animate-in slide-in-from-bottom-5"><div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black text-slate-900 uppercase">Register New Donor</h3><button onClick={() => setShowAddDonorModal(false)}><X className="w-8 h-8 text-slate-300"/></button></div><div className="space-y-4 mb-8"><InputGroup label="Full Name" value={newDonorData.name} onChange={v => setNewDonorData({...newDonorData, name: v})} /><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><InputGroup label="Phone Number" value={newDonorData.phone} onChange={v => setNewDonorData({...newDonorData, phone: v})} /><div className="space-y-2 flex-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">City / Area</label><select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={newDonorData.city} onChange={e => setNewDonorData({...newDonorData, city: e.target.value})}>{citiesRaw.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div><InputGroup label="Monthly Amount" value={newDonorData.monthlyAmount.toString()} type="number" onChange={v => setNewDonorData({...newDonorData, monthlyAmount: parseInt(v) || 0})} /><InputGroup label="Address" value={newDonorData.address} onChange={v => setNewDonorData({...newDonorData, address: v})} /><InputGroup label="Referred By" value={newDonorData.referredBy} onChange={v => setNewDonorData({...newDonorData, referredBy: v})} /><div className="space-y-2 flex-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Assign Agent</label><select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={newDonorData.assignedCollectorId} onChange={e => setNewDonorData({...newDonorData, assignedCollectorId: e.target.value})}><option value="">Office (Self)</option>{collectorsRaw.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><button onClick={() => { if (!newDonorData.name || !newDonorData.phone) return alert("Required: Name & Phone"); const donor: Donor = { id: Math.random().toString(36).substr(2, 9), name: newDonorData.name, phone: newDonorData.phone, address: newDonorData.address, city: newDonorData.city, monthlyAmount: newDonorData.monthlyAmount, referredBy: newDonorData.referredBy || 'Direct', assignedCollectorId: newDonorData.assignedCollectorId || null, lastPaymentDate: null, status: 'PENDING', joinDate: new Date().toISOString().split('T')[0] }; onUpdateState({ donors: [...donorsListRaw, donor] }); setShowAddDonorModal(false); setNewDonorData({ name: '', phone: '', address: '', city: citiesRaw[0] || '', monthlyAmount: 1000, assignedCollectorId: '', referredBy: '' }); }} className="w-full py-6 bg-red-600 text-white rounded-3xl font-black uppercase shadow-2xl flex items-center justify-center gap-2"><Save className="w-5 h-5"/> Register Donor</button></div>
        </div>
      )}

      {showAddCollectorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 relative"><button onClick={() => setShowAddCollectorModal(false)} className="absolute right-8 top-8 p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button><h3 className="text-xl font-black text-slate-900 uppercase mb-6">New Collection Agent</h3><div className="space-y-4 mb-8"><InputGroup label="Agent Name" value={newCollectorData.name} onChange={v => setNewCollectorData({...newCollectorData, name: v})} /><InputGroup label="Phone Number" value={newCollectorData.phone} onChange={v => setNewCollectorData({...newCollectorData, phone: v})} /><InputGroup label="Username" value={newCollectorData.username} onChange={v => setNewCollectorData({...newCollectorData, username: v})} /><InputGroup label="Password" value={newCollectorData.password} onChange={v => setNewCollectorData({...newCollectorData, password: v})} /><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Assigned Area</label><select className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={newCollectorData.city} onChange={e => setNewCollectorData({...newCollectorData, city: e.target.value})}>{citiesRaw.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div><button onClick={() => { if (!newCollectorData.username || !newCollectorData.name) return; const collector: User = { id: Math.random().toString(36).substr(2,9), name: newCollectorData.name, phone: newCollectorData.phone, role: UserRole.COLLECTOR, username: newCollectorData.username, password: newCollectorData.password, city: newCollectorData.city }; onUpdateState({ collectors: [...collectorsRaw, collector] }); setShowAddCollectorModal(false); setNewCollectorData({ name: '', phone: '', username: '', password: '1234', city: citiesRaw[0] || '' }); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-xl">Create Account</button></div>
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