import React from 'react';
import { 
  Receipt, 
  PlusCircle, 
  Camera, 
  FileDown, 
  Bell, 
  TrendingUp, 
  TableProperties, 
  Landmark, 
  CheckCircle2, 
  Flame 
} from 'lucide-react';
import { DailyReminderConfig } from '../types';

interface HeaderProps {
  activeTab: 'spreadsheet' | 'analytics' | 'bank';
  setActiveTab: (tab: 'spreadsheet' | 'analytics' | 'bank') => void;
  onOpenManualModal: () => void;
  onOpenScannerModal: () => void;
  onOpenReminderModal: () => void;
  onOpenPdfModal: () => void;
  reminderConfig: DailyReminderConfig;
  totalItemsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenManualModal,
  onOpenScannerModal,
  onOpenReminderModal,
  onOpenPdfModal,
  reminderConfig,
  totalItemsCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Catat<span className="text-emerald-600">Belanja</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  AI OCR + Bank Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Pencatat belanjaan pintar, spreadsheet real-time & analitik pengeluaran
              </p>
            </div>
          </div>

          {/* Quick Actions (Scan Foto, Input Manual, Ekspor PDF, Reminder) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak & Reminder button */}
            <button
              id="btn-header-reminder"
              onClick={onOpenReminderModal}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
              title="Pengingat Catat Harian"
            >
              <Bell className="w-4 h-4 text-amber-500" />
              <span className="hidden md:inline font-semibold">{reminderConfig.reminderTime}</span>
              <span className="flex items-center gap-0.5 text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {reminderConfig.streakDays}d
              </span>
            </button>

            {/* Export PDF */}
            <button
              id="btn-header-export-pdf"
              onClick={onOpenPdfModal}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-100 transition-colors border border-slate-300 shadow-2xs"
            >
              <FileDown className="w-4 h-4 text-rose-500" />
              <span className="hidden sm:inline">Laporan PDF</span>
            </button>

            {/* Input Manual */}
            <button
              id="btn-header-manual-input"
              onClick={onOpenManualModal}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-300"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Input Manual</span>
            </button>

            {/* Scan Foto Bon (Primary AI action) */}
            <button
              id="btn-header-scan-receipt"
              onClick={onOpenScannerModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 active:scale-98"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Foto Bon</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 py-2 sm:py-2.5 overflow-x-auto no-scrollbar">
          <nav className="flex space-x-2 sm:space-x-4">
            <button
              id="nav-tab-spreadsheet"
              onClick={() => setActiveTab('spreadsheet')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'spreadsheet'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TableProperties className="w-4 h-4 text-emerald-600" />
              <span>Spreadsheet & Item Belanja</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded-full text-[11px] font-semibold">
                {totalItemsCount}
              </span>
            </button>

            <button
              id="nav-tab-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Analisis Grafik Bulanan</span>
            </button>

            <button
              id="nav-tab-bank"
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'bank'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Landmark className="w-4 h-4 text-amber-600" />
              <span>Integrasi Bank & Mutasi</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
          </nav>

          {/* Sync Status Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Real-Time Spreadsheet Sync Aktif
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
