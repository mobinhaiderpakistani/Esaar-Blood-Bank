import React, { useState, useMemo } from 'react';
import { AppState, Donor, User, UserRole, DonationRecord } from '../types';
import { 
  Plus, 
  Search,
  CheckCircle2,
  X,
  History,
  MapPin,
  Building2,
  Wallet,
  Globe,
  Trash2,
  Settings,
  ChevronLeft,
  UserPlus,
  Phone,
  UserCheck,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const AdminPanel: React.FC<Props> = ({ state, onUpdateState }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'donors' | 'collectors' | 'history'>('dashboard');
  const [showAreaManagement, setShowAreaManagement] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');
  
  const donors = state.donors || [];
  const history = state.donationHistory || [];
  const cities = state.cities || [];
  const collectors = state.collectors || [];

  const today = new Date();
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });
  const monthKey = state.currentMonthKey || today.toISOString().slice(0, 7);
  const isResetDone = state.currentMonthKey === today.toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const cityDonors = selectedCityFilter === 'All' ? donors : donors.filter(d => d.city === selectedCityFilter);
    const target = cityDonors.reduce((sum, d) => sum + (Number(d.monthlyAmount) || 0), 0);
    const filteredHistory = history.filter(h => h.date && h.date.startsWith(monthKey)).filter(h => {
      if (selectedCityFilter === 'All') return true;
      const donor = donors.find(d => d.id === h.donorId);
      return donor?.city === selectedCityFilter;
    });
    const collected = filteredHistory.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    const cash = filteredHistory.filter(h => h.paymentMethod === 'CASH').reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    const online = filteredHistory.filter(h => h.paymentMethod === 'ONLINE').reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    return { target, collected, cash, online };
  }, [donors, history, selectedCityFilter, monthKey]);

  const barData = useMemo(() => {
    return cities.map(c => {
      const cityDonors = donors.filter(d => d.city === c);
      const targetVal = cityDonors.reduce((s, d) => s + (Number(d.monthlyAmount) || 0), 0);
      const collectedVal = history.filter(h => h.date.startsWith(monthKey) && donors.find(d => d.id === h.donorId)?.city === c)
        .reduce((s, h) => s + (Number(h.amount) || 0), 0);
      return { name: c, target: targetVal, collected: collectedVal };
    }).filter(x => x.target > 0);
  }, [cities, donors, history, monthKey]);

  if (showAreaManagement) {
    return (
      <div className="p-4 md:p-8 animate-in fade-in duration-500">
        <button onClick={() => setShowAreaManagement(false)} className="mb-6 flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase text-slate-500 hover:bg-slate-900 hover:text-white transition-all">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-100 shadow-sm">
           <h2 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tighter"><MapPin className="text-red-600"/> Area Management</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cities.map(city => (
                <div key={city} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl font-black text-slate-700 text-xs uppercase tracking-widest">
                  {city}
                  <button onClick={() => onUpdateState({ cities: cities.filter(c => c !== city) })}><Trash2 className="w-4 h-4 text-slate-300 hover:text-red-600" /></button>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 no-print">
        <button onClick={() => setShowAreaManagement(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"><Settings className="w-5 h-5" /></button>
        <button onClick={() => setSelectedCityFilter('All')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${selectedCityFilter === 'All' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border-slate-100'}`}>All Areas</button>
        {cities.map(c => (
          <button key={c} onClick={() => setSelectedCityFilter(c)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${selectedCityFilter === c ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-500 border-slate-100'}`}>{c}</button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex bg-white p-1.5 rounded-[24px] border border-slate-100 shadow-sm w-full md:w-auto overflow-x-auto scrollbar-hide">
          {['dashboard', 'donors', 'collectors', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 md:flex-none px-8 py-3 rounded-[18px] font-black text-[10px] uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>{tab === 'history' ? 'Status' : tab}</button>
          ))}
        </div>
        <button 
          onClick={() => {
            if (!isResetDone && window.confirm("Start new month collection?")) {
              onUpdateState({ 
                currentMonthKey: today.toISOString().slice(0, 7), 
                donors: donors.map(d => ({ ...d, status: 'PENDING' })) 
              });
            }
          }}
          className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isResetDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-600 text-white shadow-xl shadow-red-200'}`}>
          {isResetDone ? `✓ ${monthName} Active` : `Start ${monthName}`}
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard label="Target" value={`Rs. ${stats.target.toLocaleString()}`} icon={<Building2 />} color="text-blue-600" />
            <StatCard label="Collected" value={`Rs. ${stats.collected.toLocaleString()}`} icon={<TrendingUp />} color="text-emerald-600" />
            <StatCard label="Cash" value={`Rs. ${stats.cash.toLocaleString()}`} icon={<Wallet />} color="text-amber-500" />
            <StatCard label="Online" value={`Rs. ${stats.online.toLocaleString()}`} icon={<CreditCard />} color="text-blue-400" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <h3 className="text-xs font-black mb-8 uppercase text-slate-400 tracking-widest">Area-wise Collection</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar name="Target" dataKey="target" fill="#ef4444" radius={[6,6,0,0]} barSize={24} />
                    <Bar name="Collected" dataKey="collected" fill="#10b981" radius={[6,6,0,0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
               <h3 className="text-xs font-black mb-8 uppercase text-slate-400 tracking-widest">Total Progress</h3>
               <div className="relative flex items-center justify-center w-52 h-52">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="104" cy="104" r="85" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-slate-50" />
                    <circle cx="104" cy="104" r="85" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-red-600" strokeDasharray={2 * Math.PI * 85} strokeDashoffset={2 * Math.PI * 85 * (1 - (stats.collected / (stats.target || 1)))} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{Math.round((stats.collected / (stats.target || 1)) * 100)}%</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collected</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'donors' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-black uppercase tracking-tighter">Donor Database</h2>
            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" placeholder="Search donors..." className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-slate-200 transition-transform active:scale-95"><Plus className="w-4 h-4"/> Add</button>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="px-8 py-5">Donor</th>
                  <th className="px-8 py-5">Area</th>
                  <th className="px-8 py-5">Monthly</th>
                  <th className="px-8 py-5">Collector</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(searchTerm ? donors.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())) : (selectedCityFilter === 'All' ? donors : donors.filter(d => d.city === selectedCityFilter))).map(donor => (
                  <tr key={donor.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-900 text-sm tracking-tight">{donor.name}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{donor.phone}</div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-500 text-xs">{donor.city}</td>
                    <td className="px-8 py-6 font-black text-slate-900 text-sm">Rs. {donor.monthlyAmount.toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black px-3 py-1.5 bg-slate-100 rounded-lg text-slate-500 uppercase">
                        {collectors.find(c => c.id === donor.assignedCollectorId)?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${donor.status === 'COLLECTED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {donor.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <button className="p-2 text-slate-200 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'collectors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collectors.map(collector => (
            <div key={collector.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-red-100 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-slate-50 p-4 rounded-3xl text-slate-400 group-hover:bg-red-600 group-hover:text-white transition-all">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collector</p>
                  <p className="font-black text-slate-900 text-lg tracking-tight">{collector.name}</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-xs font-black text-slate-500"><Phone className="w-3 h-3 text-red-400"/> {collector.phone}</div>
                <div className="flex items-center gap-3 text-xs font-black text-slate-500"><MapPin className="w-3 h-3 text-red-400"/> {collector.city}</div>
              </div>
              <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Donors</span>
                  <span className="font-black text-slate-900">{donors.filter(d => d.assignedCollectorId === collector.id).length} Donors</span>
                </div>
                <button className="p-3 bg-slate-50 rounded-2xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          <button className="border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center p-12 text-slate-300 hover:border-red-100 hover:text-red-400 transition-all group bg-slate-50/30">
            <div className="p-5 bg-white rounded-3xl group-hover:bg-red-50 transition-all mb-4 shadow-sm"><UserPlus className="w-8 h-8" /></div>
            <span className="font-black text-[10px] uppercase tracking-widest">Hire New Collector</span>
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-slate-50 flex justify-between items-center">
             <h2 className="text-xl font-black uppercase tracking-tighter">Live Status - {monthName}</h2>
           </div>
           <div id="print-area-content" className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="px-8 py-5">Donor</th>
                  <th className="px-8 py-5">Collector</th>
                  <th className="px-8 py-5">Method</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.filter(h => h.date.startsWith(monthKey)).map(record => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-900 text-sm">{record.donorName}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{donors.find(d => d.id === record.donorId)?.city}</div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-500 text-xs uppercase">{record.collectorName}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {record.paymentMethod === 'ONLINE' ? <Globe className="w-4 h-4 text-blue-500"/> : <Wallet className="w-4 h-4 text-amber-500"/>}
                        <span className="text-[9px] font-black uppercase tracking-widest">{record.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-emerald-600 text-sm">Rs. {record.amount.toLocaleString()}</td>
                    <td className="px-8 py-6 text-[10px] text-slate-400 font-black uppercase">{new Date(record.date).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-7 md:p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
    <div className={`p-4 rounded-[22px] bg-slate-50 inline-block mb-6 ${color} shadow-inner`}>{icon}</div>
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
  </div>
);

export default AdminPanel;