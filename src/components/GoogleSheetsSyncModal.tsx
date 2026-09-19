import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  ExternalLink, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Copy, 
  Check, 
  Smartphone, 
  FileSpreadsheet, 
  Mail, 
  Sparkles,
  HeartHandshake,
  LogOut,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  googleSignOut, 
  getAccessToken,
  initAuth 
} from '../services/googleAuth';
import { 
  createHouseholdSpreadsheet, 
  findExistingSpreadsheet, 
  syncAllItemsToGoogleSheets, 
  pullItemsFromGoogleSheets,
  shareSpreadsheetWithUser,
  SPREADSHEET_TITLE
} from '../services/googleSheetsService';
import { ExpenseItem } from '../types';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ExpenseItem[];
  onUpdateAllItems: (newItems: ExpenseItem[]) => void;
  onShowAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateAllItems,
  onShowAlert,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Sheet state
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('catatbelanja_sheet_id');
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('catatbelanja_sheet_url');
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    return localStorage.getItem('catatbelanja_last_sheet_sync');
  });

  // Action loading states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Wife invite form
  const [wifeEmail, setWifeEmail] = useState('');
  const [wifeShareSuccess, setWifeShareSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Manual Sheet ID link
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [isConnectingManual, setIsConnectingManual] = useState(false);

  // Destructive Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmActionText: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessTokenState(token);
      },
      () => {
        // Not authenticated with active token
        setCurrentUser(null);
        setAccessTokenState(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Check existing spreadsheet when logged in
  useEffect(() => {
    const autoDetectSheet = async () => {
      if (!accessToken || spreadsheetId) return;
      try {
        const found = await findExistingSpreadsheet(accessToken);
        if (found) {
          setSpreadsheetId(found.id);
          const url = found.webViewLink || `https://docs.google.com/spreadsheets/d/${found.id}/edit`;
          setSpreadsheetUrl(url);
          localStorage.setItem('catatbelanja_sheet_id', found.id);
          localStorage.setItem('catatbelanja_sheet_url', url);
        }
      } catch (e) {
        console.warn('Auto detect sheet notice:', e);
      }
    };

    if (isOpen && accessToken) {
      autoDetectSheet();
    }
  }, [isOpen, accessToken, spreadsheetId]);

  if (!isOpen) return null;

  // Handle Google Login
  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessTokenState(res.accessToken);
        onShowAlert('Berhasil masuk dengan akun Google! Izin Drive & Sheets aktif.', 'success');
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      console.warn('Login notice:', err);
      onShowAlert(err.message || 'Gagal masuk dengan akun Google. Silakan coba lagi.', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Google Logout
  const handleLogout = async () => {
    try {
      await googleSignOut();
      setCurrentUser(null);
      setAccessTokenState(null);
      onShowAlert('Akun Google berhasil dikeluarkan.', 'info');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // Handle Create or Init Google Spreadsheet
  const handleCreateNewSheet = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Buat Spreadsheet Baru di Google Drive?',
      message: `Aplikasi akan membuat spreadsheet baru berjudul "${SPREADSHEET_TITLE}" di Google Drive Anda dan menyalin ${items.length} item transaksi belanjaan yang ada saat ini.`,
      confirmActionText: 'Buat & Sinkronkan',
      onConfirm: async () => {
        if (!accessToken) return;
        setIsCreatingSheet(true);
        try {
          const { spreadsheetId: newId, spreadsheetUrl: newUrl } = await createHouseholdSpreadsheet(
            accessToken,
            items
          );
          setSpreadsheetId(newId);
          setSpreadsheetUrl(newUrl);
          const nowStr = new Date().toLocaleString('id-ID');
          setLastSyncedTime(nowStr);
          localStorage.setItem('catatbelanja_sheet_id', newId);
          localStorage.setItem('catatbelanja_sheet_url', newUrl);
          localStorage.setItem('catatbelanja_last_sheet_sync', nowStr);
          onShowAlert('Spreadsheet Google Drive berhasil dibuat dan tersinkronisasi!', 'success');
        } catch (err: any) {
          console.error('Create sheet error:', err);
          onShowAlert(err.message || 'Gagal membuat Google Spreadsheet.', 'error');
        } finally {
          setIsCreatingSheet(false);
        }
      },
    });
  };

  // Handle Sync (Push local to Google Sheets) with required confirmation
  const handleSyncToGoogleSheets = () => {
    if (!spreadsheetId || !accessToken) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Perbarui Data di Google Sheets?',
      message: `Apakah Anda yakin ingin memperbarui data di Google Sheets? Sebanyak ${items.length} item belanjaan saat ini akan disinkronkan ke lembar kerja "${SPREADSHEET_TITLE}". Tindakan ini akan menimpa baris yang ada dengan data terbaru.`,
      confirmActionText: 'Sinkronkan Sekarang',
      onConfirm: async () => {
        setIsSyncing(true);
        try {
          await syncAllItemsToGoogleSheets(accessToken, spreadsheetId, items);
          const nowStr = new Date().toLocaleString('id-ID');
          setLastSyncedTime(nowStr);
          localStorage.setItem('catatbelanja_last_sheet_sync', nowStr);
          onShowAlert(`Berhasil memperbarui ${items.length} item ke Google Sheets!`, 'success');
        } catch (err: any) {
          console.error('Sync error:', err);
          onShowAlert(err.message || 'Gagal menyinkronkan data ke Google Sheets.', 'error');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Handle Pull (Fetch from Google Sheets updated by spouse)
  const handlePullFromGoogleSheets = () => {
    if (!spreadsheetId || !accessToken) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Tarik Data dari Google Sheets?',
      message: `Aplikasi akan mengunduh catatan belanja terbaru dari Google Sheets. Jika istri Anda telah mencatat transaksi baru melalui HP-nya, data tersebut akan digabungkan ke aplikasi ini.`,
      confirmActionText: 'Tarik Data',
      onConfirm: async () => {
        setIsPulling(true);
        try {
          const pulledItems = await pullItemsFromGoogleSheets(accessToken, spreadsheetId);
          if (pulledItems.length === 0) {
            onShowAlert('Tidak ada baris data transaksi yang ditemukan di Google Sheets.', 'info');
          } else {
            onUpdateAllItems(pulledItems);
            const nowStr = new Date().toLocaleString('id-ID');
            setLastSyncedTime(nowStr);
            localStorage.setItem('catatbelanja_last_sheet_sync', nowStr);
            onShowAlert(`Berhasil menarik ${pulledItems.length} item belanjaan dari Google Sheets!`, 'success');
          }
        } catch (err: any) {
          console.error('Pull error:', err);
          onShowAlert(err.message || 'Gagal menarik data dari Google Sheets.', 'error');
        } finally {
          setIsPulling(false);
        }
      },
    });
  };

  // Handle Invite Wife
  const handleShareWithWife = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = wifeEmail.trim().toLowerCase();
    if (!cleanEmail) {
      onShowAlert('Silakan masukkan alamat email Gmail istri terlebih dahulu.', 'info');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      onShowAlert('Format email tidak valid. Pastikan alamat email benar.', 'error');
      return;
    }

    setIsSharing(true);
    setWifeShareSuccess(null);
    try {
      let activeToken = accessToken;

      // 1. If not logged in or token is missing, authenticate first
      if (!activeToken) {
        onShowAlert('Membuka login Google untuk mengizinkan akses Google Drive...', 'info');
        const loginRes = await googleSignIn();
        if (!loginRes) {
          setIsSharing(false);
          return;
        }
        activeToken = loginRes.accessToken;
        setAccessTokenState(activeToken);
        setCurrentUser(loginRes.user);
      }

      // 2. If no spreadsheet created yet, automatically create one in Google Drive
      let activeSheetId = spreadsheetId;
      if (!activeSheetId) {
        onShowAlert('Membuat spreadsheet "CatatBelanja" baru di Google Drive Anda...', 'info');
        const newSheet = await createHouseholdSpreadsheet(activeToken, items);
        activeSheetId = newSheet.spreadsheetId;
        setSpreadsheetId(newSheet.spreadsheetId);
        setSpreadsheetUrl(newSheet.spreadsheetUrl);
        localStorage.setItem('catatbelanja_sheet_id', newSheet.spreadsheetId);
        localStorage.setItem('catatbelanja_sheet_url', newSheet.spreadsheetUrl);
        setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }

      if (!activeSheetId) {
        throw new Error('Gagal menyiapkan spreadsheet untuk dibagikan.');
      }

      // 3. Share with wife
      await shareSpreadsheetWithUser(activeToken, activeSheetId, cleanEmail);
      setWifeShareSuccess(`Akses berhasil dikirim ke ${cleanEmail}! Istri Anda dapat langsung membuka dan mengedit file ini.`);
      setWifeEmail('');
      onShowAlert(`Akses Google Sheets berhasil dibagikan ke ${cleanEmail}!`, 'success');
    } catch (err: any) {
      console.warn('Share warning:', err);
      onShowAlert(err.message || 'Gagal membagikan akses ke email istri. Pastikan email valid.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  // Connect Manual Sheet ID (useful if wife enters the sheet ID husband created)
  const handleConnectManualSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetInput.trim()) return;

    let extractedId = manualSheetInput.trim();
    // Support full URL: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit...
    const urlMatch = manualSheetInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      extractedId = urlMatch[1];
    }

    setSpreadsheetId(extractedId);
    const url = `https://docs.google.com/spreadsheets/d/${extractedId}/edit`;
    setSpreadsheetUrl(url);
    localStorage.setItem('catatbelanja_sheet_id', extractedId);
    localStorage.setItem('catatbelanja_sheet_url', url);
    setManualSheetInput('');
    setIsConnectingManual(false);
    onShowAlert('Berhasil menghubungkan Spreadsheet ID bersama!', 'success');
  };

  // Copy share link
  const handleCopyLink = () => {
    if (!spreadsheetUrl) return;
    navigator.clipboard.writeText(spreadsheetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    onShowAlert('Link Google Sheets disalin ke papan klip!', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        id="modal-google-sheets-sync"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-scaleUp my-6 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Sinkronisasi Google Sheets & Drive
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Kolaborasi Suami Istri
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hubungkan akun Google untuk menyimpan transaksi & berbagi akses dengan pasangan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs sm:text-sm">
          
          {/* Status 1: Not Authenticated */}
          {!currentUser ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
                <HeartHandshake className="w-9 h-9 text-emerald-600" />
              </div>

              <div className="max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-900">
                  Gunakan Bersama Pasangan Lewat HP Masing-Masing
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Dengan menghubungkan Google Workspace, setiap foto bon belanja dan input manual akan otomatis tersimpan ke lembar kerja <strong>Google Sheets</strong> di Google Drive Anda. Istri Anda dapat mengakses dan mencatat pengeluaran dari ponselnya secara bersamaan.
                </p>
              </div>

              {/* Official Google Sign In Button */}
              <div className="pt-2 flex justify-center">
                <button
                  id="btn-google-sign-in"
                  type="button"
                  disabled={isAuthenticating}
                  onClick={handleLogin}
                  className="gsi-material-button inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-300 shadow-2xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>{isAuthenticating ? 'Menghubungkan Akun...' : 'Masuk dengan Akun Google'}</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Izin Google Sheets
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Izin Google Drive File
                </span>
              </div>
            </div>
          ) : (
            /* Status 2: Authenticated with Google */
            <div className="space-y-6">
              
              {/* Profile Card & Account State */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.displayName || 'User'} 
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-emerald-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {currentUser.displayName || 'Pengguna Google'}
                      </span>
                      <span className="px-1.5 py-0.2 bg-emerald-200/80 text-emerald-800 rounded font-semibold text-[10px]">
                        Terhubung
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {currentUser.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Ganti Akun</span>
                  </button>
                </div>
              </div>

              {/* Spreadsheet Connection Box */}
              <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {SPREADSHEET_TITLE}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {spreadsheetId ? `ID: ${spreadsheetId.substring(0, 16)}...` : 'Belum ada lembar kerja yang tersambung'}
                      </p>
                    </div>
                  </div>

                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors w-fit"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka di Google Sheets</span>
                    </a>
                  )}
                </div>

                {/* If no sheet connected yet */}
                {!spreadsheetId ? (
                  <div className="py-2 text-center space-y-3">
                    <p className="text-xs text-slate-600">
                      Buat spreadsheet baru sekarang agar catatan belanja keluarga langsung tersimpan di Google Drive.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={handleCreateNewSheet}
                        disabled={isCreatingSheet}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs disabled:opacity-50"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{isCreatingSheet ? 'Membuat Spreadsheet...' : 'Buat Spreadsheet di Google Drive'}</span>
                      </button>
                      <button
                        onClick={() => setIsConnectingManual(!isConnectingManual)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-300 rounded-xl"
                      >
                        Tautkan ID Sheet yang Sudah Ada
                      </button>
                    </div>
                  </div>
                ) : (
                  /* If sheet is connected */
                  <div className="space-y-4">
                    {/* Sync Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Push to Sheets */}
                      <button
                        onClick={handleSyncToGoogleSheets}
                        disabled={isSyncing}
                        className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all shadow-2xs active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{isSyncing ? 'Mengunggah...' : `Kirim Data Lokal ke Google Sheets (${items.length} Item)`}</span>
                      </button>

                      {/* Pull from Sheets */}
                      <button
                        onClick={handlePullFromGoogleSheets}
                        disabled={isPulling}
                        className="flex items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs border border-slate-300 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        <DownloadCloud className="w-4 h-4 text-emerald-600" />
                        <span>{isPulling ? 'Menarik Data...' : 'Tarik Catatan dari Google Sheets'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      <span>Terakhir disinkronkan: <strong className="text-slate-700">{lastSyncedTime || 'Belum pernah'}</strong></span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Google Drive Siap
                      </span>
                    </div>
                  </div>
                )}

                {/* Manual Link Input */}
                {isConnectingManual && (
                  <form onSubmit={handleConnectManualSheet} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Masukkan Tautan atau ID Spreadsheet:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualSheetInput}
                        onChange={(e) => setManualSheetInput(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/.../edit atau Sheet ID"
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
                      >
                        Hubungkan
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Husband & Wife Sharing Guide & Invite Form */}
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      Bagikan ke Istri (Kolaborasi 2 HP)
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Agar istri Anda bisa melihat dan mencatat belanjaan langsung dari HP-nya:
                    </p>
                  </div>
                </div>

                {/* Step 1: Invite Email */}
                <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-2.5">
                  <span className="font-semibold text-xs text-slate-800 block flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    Langkah 1: Berikan Hak Akses ke Akun Google Istri
                  </span>
                  <form onSubmit={handleShareWithWife} className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={wifeEmail}
                      onChange={(e) => setWifeEmail(e.target.value)}
                      placeholder="Masukkan alamat email Google istri (contoh: istri@gmail.com)"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isSharing}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {isSharing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isSharing ? 'Memproses...' : 'Kirim Akses Edit'}</span>
                    </button>
                  </form>
                  <div className="text-[11px] pt-0.5">
                    {!currentUser ? (
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Login Google akan otomatis diminta saat klik Kirim Akses.
                      </span>
                    ) : !spreadsheetId ? (
                      <span className="text-indigo-700 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        Spreadsheet akan dibuat otomatis di Drive Anda lalu dibagikan.
                      </span>
                    ) : (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Siap dibagikan dari lembar kerja Drive Anda.
                      </span>
                    )}
                  </div>

                  {wifeShareSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{wifeShareSuccess}</span>
                    </div>
                  )}
                </div>

                {/* Step 2: Open link on Wife's phone */}
                <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-2">
                  <span className="font-semibold text-xs text-slate-800 block flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    Langkah 2: Buka di HP Istri
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kirim tautan ini via WhatsApp ke istri Anda. Istri Anda dapat membukanya langsung di browser Chrome/Safari pada ponselnya, masuk dengan akun Google miliknya, dan semua transaksi belanja akan tersinkronisasi dua arah.
                  </p>
                  
                  {spreadsheetUrl && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        readOnly
                        value={spreadsheetUrl}
                        className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-600 font-mono select-all"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Tersalin' : 'Salin Tautan'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Google Workspace API (Drive & Sheets)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Explicit User Confirmation Dialog (MANDATORY per Workspace Integration Skill) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {confirmDialog.title}
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await action();
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
              >
                {confirmDialog.confirmActionText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
