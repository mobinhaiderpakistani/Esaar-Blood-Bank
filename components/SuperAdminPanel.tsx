import React, { useState } from 'react';
import { AppState, User, UserRole } from '../types';
import { 
  ShieldAlert, 
  Users, 
  Trash2, 
  UserPlus, 
  Database, 
  ShieldCheck, 
  History,
  Lock,
  Globe,
  Settings,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface Props {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const SuperAdminPanel: React.FC<Props> = ({ state, onUpdateState }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'admins' | 'system'>('overview');
  const [newAdmin, setNewAdmin] = useState({ name: '', username: '', password: '' });

  const totalAdmins = (state.collectors || []).filter(u => u.role === UserRole.ADMIN).length;
  const totalCollectors = (state.collectors || []).filter(u => u.role === UserRole.COLLECTOR).length;

  const handleCreateAdmin = () => {
    if (!newAdmin.name || !newAdmin.username || !newAdmin.password) return;
    const adminUser: User = {
      id: 'adm-' + Math.random().toString(36).substr(2, 5),
      name: newAdmin.name,
      username: newAdmin.username,
      password: newAdmin.password,
      role: UserRole.ADMIN,
      phone: 'N/A'
    };
    onUpdateState({ collectors: [...(state.collectors || []), adminUser] });
    setNewAdmin({ name: '', username: '', password: '' });
    alert("Admin created successfully!");
  };

  const handleWipeData = () => {
    if (window.confirm("CRITICAL ACTION: Are you sure you want to wipe all donation history? This cannot be undone.")) {
      onUpdateState({ donationHistory: [] });
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <ShieldAlert className="text-red-600 w-10 h-10" /> SUPER CONTROL
          </h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Esaar System Governance</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-[24px] border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide w-full md:w-auto">
          {['overview', 'admins', 'system'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`px-8 py-3 rounded-[18px] font-black text-[10px] uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
          <StatBox label="System Admins" value={totalAdmins} icon={<ShieldCheck />} color="text-blue-600" />
          <StatBox label="Active Collectors" value={totalCollectors} icon={<Users />} color="text-emerald-600" />
          <StatBox label="Total Records" value={state.donationHistory?.length || 0} icon={<History />} color="text-red-600" />
          
          <div className="md:col-span-3 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black mb-8 uppercase text-slate-400 tracking-widest">Global Activity Overview</h3>
            <div className="space-y-6">
               <p className="text-slate-600 leading-relaxed font-medium">As a Super Admin, you have full authority over the cloud database. You can manage system-level access and perform critical data operations. Monitor the health of your collection network across all areas.</p>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-6 bg-slate-50 rounded-3xl">
                     <TrendingUp className="text-emerald-500 mb-2" />
                     <p className="text-[10px] font-black uppercase text-slate-400">Monthly Flow</p>
                     <p className="text-xl font-black text-slate-900">Active</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl">
                     <Globe className="text-blue-500 mb-2" />
                     <p className="text-[10px] font-black uppercase text-slate-400">Nodes</p>
                     <p className="text-xl font-black text-slate-900">{state.cities?.length || 0} Cities</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-50">
                <h2 className="text-xl font-black uppercase tracking-tighter">System Access Control</h2>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Administrator</th>
                      <th className="px-8 py-5">Username</th>
                      <th className="px-8 py-5">Security</th>
                      <th className="px-8 py-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(state.collectors || []).filter(u => u.role === UserRole.ADMIN).map(admin => (
                      <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6 font-black text-slate-900">{admin.name}</td>
                        <td className="px-8 py-6 font-black text-slate-500">{admin.username}</td>
                        <td className="px-8 py-6"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">ADMIN ROLE</span></td>
                        <td className="px-8 py-6">
                           <button onClick={() => onUpdateState({ collectors: state.collectors.filter(c => c.id !== admin.id) })} className="p-2 text-slate-200 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-fit">
             <h3 className="text-xs font-black mb-8 uppercase text-slate-400 tracking-widest">Create New Admin</h3>
             <div className="space-y-4">
                <input type="text" placeholder="Full Name" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} />
                <input type="text" placeholder="Username" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} />
                <input type="password" placeholder="System Password" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} />
                <button onClick={handleCreateAdmin} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
                  <UserPlus className="w-4 h-4" /> Grant Admin Access
                </button>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="max-w-2xl mx-auto space-y-6">
           <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10" /></div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-4">Dangerous Actions</h2>
              <p className="text-slate-500 mb-8 font-medium">These actions are irreversible and affect the entire cloud database. Only perform these during maintenance or year-end cleanup.</p>
              
              <div className="space-y-4">
                <button onClick={handleWipeData} className="w-full py-6 border-2 border-red-100 text-red-600 rounded-[32px] font-black uppercase text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3">
                   <Database className="w-5 h-5" /> Wipe Donation History
                </button>
                <div className="p-6 bg-slate-50 rounded-[32px] text-left">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Backup Recommendation</p>
                   <p className="text-xs text-slate-600 font-medium">Always export your reports to PDF before wiping any live data from the system.</p>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
    <div className={`p-4 rounded-2xl bg-slate-50 inline-block mb-6 ${color}`}>{icon}</div>
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
  </div>
);

export default SuperAdminPanel;