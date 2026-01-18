import React, { useState, useEffect, useCallback } from 'react';
import { AppState, User, UserRole, LogEntry } from './types';
import { INITIAL_DONORS, INITIAL_COLLECTORS, CITIES } from './constants';
import DashboardHeader from './components/DashboardHeader';
import AdminPanel from './components/AdminPanel';
import CollectorPanel from './components/CollectorPanel';
import { Droplets, Lock, Eye, EyeOff, X } from 'lucide-react';

const firebase = (window as any).firebase;

const firebaseConfig = {
  apiKey: "AIzaSyD4ITcoh4mhq_PuzMev4xn9Mx0vcF-op38",
  authDomain: "esaar-blood-bank.appspot.com",
  databaseURL: "https://esaar-blood-bank-default-rtdb.firebaseio.com",
  projectId: "esaar-blood-bank",
  storageBucket: "esaar-blood-bank.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

if (firebase && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => ({
    currentUser: null,
    donors: INITIAL_DONORS,
    collectors: INITIAL_COLLECTORS,
    donationHistory: [],
    logs: [],
    cities: CITIES,
    currentMonthKey: "2026-01", 
    adminPassword: "admin",
    superAdminPassword: "superadmin"
  }));

  const [usernameInput, setUsernameInput] = useState('superadmin');
  const [passwordInput, setPasswordInput] = useState('superadmin');
  const [error, setError] = useState('');
  const [collectorTab, setCollectorTab] = useState<'pending' | 'history'>('pending');
  const [isAdminPassModalOpen, setIsAdminPassModalOpen] = useState(false);
  
  const [newAdminPass, setNewAdminPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const ensureArray = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Object.values(data);
  };

  useEffect(() => {
    if (!firebase) return;
    const dbRef = firebase.database().ref('esaar_state');
    const handleData = (snapshot: any) => {
      const cloudData = snapshot.val();
      if (cloudData) {
        setState(prev => ({
          ...prev,
          ...cloudData,
          donors: ensureArray(cloudData.donors),
          collectors: ensureArray(cloudData.collectors),
          donationHistory: ensureArray(cloudData.donationHistory),
          logs: ensureArray(cloudData.logs),
          cities: ensureArray(cloudData.cities),
          currentMonthKey: cloudData.currentMonthKey || "2026-01",
          adminPassword: cloudData.adminPassword || "admin",
          superAdminPassword: cloudData.superAdminPassword || "superadmin",
          currentUser: prev.currentUser 
        }));
      } else {
        dbRef.set({
          donors: INITIAL_DONORS,
          collectors: INITIAL_COLLECTORS,
          donationHistory: [],
          logs: [],
          cities: CITIES,
          currentMonthKey: "2026-01",
          adminPassword: "admin",
          superAdminPassword: "superadmin"
        });
      }
    };
    dbRef.on('value', handleData);
    return () => dbRef.off('value', handleData);
  }, []);

  const updateGlobalState = useCallback((newState: Partial<AppState>) => {
    if (!firebase) return;
    
    setState(prev => {
      const updatedFullState = { ...prev, ...newState };
      
      firebase.database().ref('esaar_state').update({
        donors: updatedFullState.donors,
        collectors: updatedFullState.collectors,
        donationHistory: updatedFullState.donationHistory,
        logs: updatedFullState.logs,
        cities: updatedFullState.cities,
        currentMonthKey: updatedFullState.currentMonthKey,
        adminPassword: updatedFullState.adminPassword || "admin",
        superAdminPassword: updatedFullState.superAdminPassword || "superadmin"
      });

      return updatedFullState;
    });
  }, []);

  const handleExport = async () => {
    const data = {
      donors: state.donors,
      collectors: state.collectors,
      donationHistory: state.donationHistory,
      logs: state.logs,
      cities: state.cities,
      currentMonthKey: state.currentMonthKey
    };
    const jsonString = JSON.stringify(data, null, 2);
    
    const now = new Date();
    const datePart = now.toISOString().split('T')[0];
    const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `esaar_backup_${datePart}_${timePart}.json`;

    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      try {
        const file = new File([jsonString], fileName, { type: 'application/json' });
        await navigator.share({
          files: [file],
          title: 'Esaar Database Backup',
          text: 'Save your database backup file'
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'JSON Backup',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    alert("Backup saved to your Downloads folder.");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = usernameInput.trim().toLowerCase();
    
    if (cleanUsername === 'superadmin' && passwordInput === (state.superAdminPassword || "superadmin")) {
      setState(prev => ({ ...prev, currentUser: { id: 'superadmin', name: 'Super Admin', phone: '000', role: UserRole.SUPER_ADMIN, username: 'superadmin' } }));
    } 
    else if (cleanUsername === 'admin' && passwordInput === (state.adminPassword || "admin")) {
      setState(prev => ({ ...prev, currentUser: { id: 'admin', name: 'System Admin', phone: '001', role: UserRole.ADMIN, username: 'admin' } }));
    } 
    else {
      const collectors = state.collectors || [];
      const collector = collectors.find(c => 
        c.username.toLowerCase() === cleanUsername && 
        (c.password ? c.password === passwordInput : passwordInput === '1234')
      );
      if (collector) {
        setState(prev => ({ ...prev, currentUser: collector }));
      } else {
        setError('Incorrect credentials');
      }
    }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setUsernameInput('');
    setPasswordInput('');
  };

  const changeAdminPassword = () => {
    if (!newAdminPass || !state.currentUser) return;
    if (state.currentUser.role === UserRole.SUPER_ADMIN) {
      updateGlobalState({ superAdminPassword: newAdminPass });
    } else {
      updateGlobalState({ adminPassword: newAdminPass });
    }
    setIsAdminPassModalOpen(false);
    setNewAdminPass('');
    alert("Password updated successfully!");
  };

  if (!state.currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-red-600 p-4 rounded-[28px] shadow-2xl mb-6 shadow-red-200"><Droplets className="text-white w-12 h-12" /></div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Esaar Blood Bank</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">v3.7.2 Cloud Platform</p>
          </div>
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Username</label>
                <input type="text" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Password</label>
                <input type="password" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
              </div>
              {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[22px] font-black hover:bg-black transition-all">Login</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdminPanel = state.currentUser.role === UserRole.ADMIN || state.currentUser.role === UserRole.SUPER_ADMIN;

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader 
        user={state.currentUser} 
        onLogout={handleLogout} 
        onProfileClick={() => isAdminPanel && setIsAdminPassModalOpen(true)}
        onBackupClick={isAdminPanel ? handleExport : undefined}
      />
      <main className="max-w-7xl mx-auto">
        {isAdminPanel ? 
          <AdminPanel state={state} onUpdateState={updateGlobalState} onBackupClick={handleExport} /> : 
          <CollectorPanel user={state.currentUser} state={state} onUpdateState={updateGlobalState} activeTab={collectorTab} setActiveTab={setCollectorTab} />
        }
      </main>

      {isAdminPassModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 no-print">
          <div className="bg-white w-full max-sm rounded-[32px] shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">{state.currentUser.role === UserRole.SUPER_ADMIN ? 'Super Admin Security' : 'Admin Security'}</h3>
              <button onClick={() => setIsAdminPassModalOpen(false)}><X className="w-5 h-5 text-slate-300"/></button>
            </div>
            <div className="space-y-4 mb-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Change Password</p>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPass ? "text" : "password"} placeholder="New Password"  className="w-full pl-11 pr-11 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button onClick={changeAdminPassword} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm">Update Password</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;