
import React from 'react';
import { User, UserRole } from '../types';
import { LogOut, Droplets, User as UserIcon, Settings, CloudDownload } from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
  onProfileClick?: () => void;
  onBackupClick?: () => void;
}

const DashboardHeader: React.FC<Props> = ({ user, onLogout, onProfileClick, onBackupClick }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg">
            <Droplets className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold text-slate-800 tracking-tight">Esaar Blood Bank</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Cloud Live
              </div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">v3.7.0</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {onBackupClick && (
            <button 
              onClick={onBackupClick}
              title="Database Backup (Choose Location)"
              className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all border border-blue-100 flex items-center justify-center group"
            >
              <CloudDownload className="w-5 h-5 group-active:scale-90 transition-transform" />
            </button>
          )}

          <div 
            onClick={onProfileClick}
            className={`flex flex-col items-end mr-2 ${onProfileClick ? 'cursor-pointer hover:opacity-70 transition-all group' : ''}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-900">{user.name}</span>
              {onProfileClick && <Settings className="w-3 h-3 text-slate-300 group-hover:text-red-500" />}
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role} PANEL</span>
          </div>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline font-black text-xs uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
