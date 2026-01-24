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
        // Standard sync without any pruning logic
        setState(prev => ({
          ...prev,
          ...cloudData,
          donors: ensureArray(cloudData.donors),
          collectors: ensureArray(cloudData.collectors),
          donationHistory: ensureArray(cloudData.donationHistory),
          logs: ensureArray(cloudData.logs),
          cities: ensureArray(cloudData.cities),
          currentMonthKey: cloudData.currentMonthKey || "2026-01",
          currentUser: prev.currentUser 
        }));
      } else {
        // First-time database setup
        dbRef.set({
          donors: INITIAL_DONORS,
          collectors: INITIAL_COLLECTORS,
          donationHistory: [],
          logs: [],
          cities: CITIES,
          currentMonthKey: "2026-01"
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
      const dbRef = firebase.database().ref('esaar_state');
      
      Object.keys(newState).forEach(key => {
        const val = (newState as any)[key];
        if (val !== undefined) {
          dbRef.child(key).set(val);
        }
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
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `esaar_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.createObjectURL(blob);
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
      const collector = state.collectors.find(c => c.username.toLowerCase() === cleanUsername && (c.password ? c.password === passwordInput : passwordInput === '123'));
      if (collector) {
        setState(prev => ({ ...prev, currentUser: collector }));
      } else {
        setError('Incorrect credentials');
      }
    }
  };

  if (!state.currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-red-600 p-4 rounded-[28px] shadow-2xl mb-6 shadow-red-200"><Droplets className="text-white w-12 h-12" /></div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Esaar Blood Bank</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Cloud Platform</p>
          </div>
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
            <form onSubmit={handleLogin} className="space-y-6">
              <input type="text" placeholder="Username" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-slate-100 transition-all" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-slate-100 transition-all" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
              {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[22px] font-black hover:bg-black active:scale-[0.98] transition-all">Login</button>
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
        onLogout={() => setState(prev => ({ ...prev, currentUser: null }))} 
        onBackupClick={isAdminPanel ? handleExport : undefined} 
      />
      <main className="max-w-7xl mx-auto">
        {isAdminPanel ? (
          <AdminPanel state={state} onUpdateState={updateGlobalState} onBackupClick={handleExport} />
        ) : (
          <CollectorPanel 
            user={state.currentUser} 
            state={state} 
            onUpdateState={updateGlobalState} 
            activeTab={collectorTab} 
            setActiveTab={setCollectorTab} 
          />
        )}
      </main>
    </div>
  );
};

export default App;