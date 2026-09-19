import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Share2, 
  ExternalLink, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  Smartphone, 
  Users, 
  Copy, 
  Check, 
  Mail, 
  Sparkles, 
  HeartHandshake, 
  LogOut, 
  AlertTriangle,
  RefreshCw,
  Info,
  ShieldCheck
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  googleSignOut, 
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
import { formatRupiah } from '../data/sampleData';

interface GoogleSheetsViewProps {
  items: ExpenseItem[];
  onUpdateAllItems: (newItems: ExpenseItem[]) => void;
  onShowAlert: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({
  items,
  onUpdateAllItems,
  onShowAlert,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Spreadsheet state
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

  // Invite Wife Form
  const [wifeEmail, setWifeEmail] = useState('');
  const [wifeShareSuccess, setWifeShareSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);

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
        setCurrentUser(null);
        setAccessTokenState(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Check existing spreadsheet when authenticated
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

    if (accessToken) {
      autoDetectSheet();
    }
  }, [accessToken, spreadsheetId]);

  // Google Login
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
      onShowAlert(err.message || 'Gagal masuk dengan akun Google.', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Google Logout
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

  // Create Household Sheet
  const handleCreateNewSheet = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Buat Spreadsheet Baru di Google Drive?',
      message: `Aplikasi akan membuat spreadsheet baru berjudul "${SPREADSHEET_TITLE}" di Google Drive Anda dan menyalin ${items.length} transaksi belanjaan saat ini.`,
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

  // Push to Google Sheets (Safe with confirmation dialog)
  const handleSyncToGoogleSheets = () => {
    if (!spreadsheetId || !accessToken) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Perbarui Data di Google Sheets?',
      message: `Apakah Anda yakin ingin memperbarui data di Google Sheets? Sebanyak ${items.length} item belanjaan saat ini akan disinkronkan ke lembar kerja "${SPREADSHEET_TITLE}". Tindakan ini akan menimpa data baris di spreadsheet dengan daftar transaksi saat ini.`,
      confirmActionText: 'Sinkronkan Sekarang',
      onConfirm: async () => {
        setIsSyncing(true);
        try {
          await syncAllItemsToGoogleSheets(accessToken, spreadsheetId, items);
          const nowStr = new Date().toLocaleString('id-ID');
          setLastSyncedTime(nowStr);
          localStorage.setItem('catatbelanja_last_sheet_sync', nowStr);
          onShowAlert(`Berhasil menyinkronkan ${items.length} item ke Google Sheets!`, 'success');
        } catch (err: any) {
          console.error('Sync error:', err);
          onShowAlert(err.message || 'Gagal menyinkronkan data ke Google Sheets.', 'error');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Pull from Google Sheets (Safe with confirmation dialog)
  const handlePullFromGoogleSheets = () => {
    if (!spreadsheetId || !accessToken) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Tarik Catatan Belanja dari Google Sheets?',
      message: `Aplikasi akan mengunduh catatan transaksi terbaru dari Google Sheets. Jika istri Anda telah mencatat pengeluaran dari ponselnya, data tersebut akan digabungkan ke aplikasi Anda.`,
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

  // Share with wife
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
      setWifeShareSuccess(`Akses Edit berhasil diberikan ke ${cleanEmail}! Istri Anda sekarang dapat mengakses Google Sheets ini.`);
      setWifeEmail('');
      onShowAlert(`Akses Google Sheets berhasil dibagikan ke ${cleanEmail}!`, 'success');
    } catch (err: any) {
      console.warn('Share warning:', err);
      onShowAlert(err.message || 'Gagal membagikan akses. Pastikan akun Google terhubung dan email valid.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  // Manual Sheet ID
  const handleConnectManualSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetInput.trim()) return;

    let extractedId = manualSheetInput.trim();
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

  // Copy link
  const handleCopyLink = () => {
    if (!spreadsheetUrl) return;
    navigator.clipboard.writeText(spreadsheetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    onShowAlert('Tautan Google Sheets berhasil disalin!', 'info');
  };

  // Copy WhatsApp invitation message
  const handleCopyWhatsApp = () => {
    const text = `Halo Sayang, ini lembar Google Sheets catatan belanja rumah tangga kita: ${spreadsheetUrl || ''}. Kita bisa pakai bersama lewat HP masing-masing ya! ❤️`;
    navigator.clipboard.writeText(text);
    setCopiedWhatsAppMsg(true);
    setTimeout(() => setCopiedWhatsAppMsg(false), 2500);
    onShowAlert('Pesan WhatsApp untuk istri disalin ke papan klip!', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Hero */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-200 shrink-0">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Google Sheets & Drive Bersama
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                  Kolaborasi Suami Istri (2 HP)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Data belanja disimpan langsung di Google Drive akun Anda dalam format <strong>Google Spreadsheet</strong>. Anda dan istri dapat mencatat bon belanjaan dari ponsel masing-masing kapan saja tanpa khawatir data hilang.
              </p>
            </div>
          </div>

          {/* Account Status Badge & Login Button */}
          <div>
            {!currentUser ? (
              <button
                id="btn-sheets-view-login"
                onClick={handleLogin}
                disabled={isAuthenticating}
                className="gsi-material-button inline-flex items-center gap-2.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-2xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{isAuthenticating ? 'Menghubungkan...' : 'Hubungkan Akun Google'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 sm:p-2.5 rounded-xl">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full border border-emerald-300"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">
                      {currentUser.displayName || 'Pengguna'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="text-[11px] text-slate-500 block truncate max-w-[170px]">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 rounded-lg transition-colors ml-1"
                  title="Keluar dari akun Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Spreadsheet Control, Right = Spouse Collaboration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Spreadsheet Sync & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Spreadsheet Status & Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Lembar Kerja Google Drive
                </h3>
              </div>

              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Google Sheets ↗</span>
                </a>
              )}
            </div>

            {/* If not logged in */}
            {!currentUser ? (
              <div className="py-6 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Masuk dengan akun Google untuk menghubungkan lembar kerja Google Sheets di Google Drive Anda.
                </p>
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  Masuk dengan Akun Google
                </button>
              </div>
            ) : !spreadsheetId ? (
              /* If logged in but no spreadsheet yet */
              <div className="py-6 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                <FileSpreadsheet className="w-9 h-9 text-emerald-600 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Belum Ada Spreadsheet yang Terhubung
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Buat spreadsheet baru sekarang untuk mulai menyimpan catatan belanja keluarga Anda secara otomatis.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleCreateNewSheet}
                    disabled={isCreatingSheet}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-2xs disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isCreatingSheet ? 'Membuat Spreadsheet...' : 'Buat Spreadsheet Baru di Drive'}</span>
                  </button>
                  <button
                    onClick={() => setIsConnectingManual(!isConnectingManual)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    Tautkan ID Spreadsheet yang Sudah Ada
                  </button>
                </div>
              </div>
            ) : (
              /* If spreadsheet is active */
              <div className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Judul File:</span>
                    <strong className="text-slate-800 text-sm font-bold">{SPREADSHEET_TITLE}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Status Sinkronisasi:</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Tersambung Real-time
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleSyncToGoogleSheets}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all shadow-2xs active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isSyncing ? 'Mengunggah...' : `Kirim Data Lokal ke Sheets (${items.length} Item)`}</span>
                  </button>

                  <button
                    onClick={handlePullFromGoogleSheets}
                    disabled={isPulling}
                    className="flex items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs border border-slate-300 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    <DownloadCloud className="w-4 h-4 text-emerald-600" />
                    <span>{isPulling ? 'Menarik Data...' : 'Tarik Catatan dari Sheets'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>Terakhir diperbarui: <strong>{lastSyncedTime || 'Belum pernah'}</strong></span>
                  <span className="text-slate-400">Total {items.length} baris belanja</span>
                </div>
              </div>
            )}

            {/* Manual ID Input */}
            {isConnectingManual && (
              <form onSubmit={handleConnectManualSheet} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Tautkan Spreadsheet ID atau URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualSheetInput}
                    onChange={(e) => setManualSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
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

          {/* Quick Preview Table of synced data */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <span>Pratinjau Kolom Google Sheets</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  ({items.length} transaksi)
                </span>
              </h4>
              <span className="text-[11px] text-slate-400">Sheet: CatatBelanja</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-56 overflow-y-auto">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-2.5">Tanggal</th>
                    <th className="py-2 px-2.5">Toko / Merchant</th>
                    <th className="py-2 px-2.5">Nama Item Belanja</th>
                    <th className="py-2 px-2.5 text-right">Total (Rp)</th>
                    <th className="py-2 px-2.5">Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {items.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2.5 font-mono">{item.date}</td>
                      <td className="py-1.5 px-2.5 font-medium">{item.storeName}</td>
                      <td className="py-1.5 px-2.5 text-slate-900">{item.itemName}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-emerald-700">
                        {formatRupiah(item.totalPrice)}
                      </td>
                      <td className="py-1.5 px-2.5">{item.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * Kolom lengkap mencakup: ID, Tanggal, Toko, Nama Item, Kategori, Jumlah, Harga Satuan, Total Harga, Metode Bayar, Sumber, dan Catatan.
            </p>
          </div>

        </div>

        {/* Right: Spouse Collaboration 2-Phone Setup (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 shadow-2xs space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs shadow-indigo-200">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Panduan Kolaborasi 2 Ponsel
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Bagikan lembar kerja ini agar istri Anda bisa melihat dan mencatat belanjaan langsung dari HP-nya.
                </p>
              </div>
            </div>

            {/* Step 1: Invite Wife Email */}
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="font-bold text-xs text-slate-800">
                  Beri Izin Akses ke Email Istri
                </span>
              </div>
              
              <p className="text-xs text-slate-600 leading-relaxed">
                Ketik alamat Gmail istri Anda. Sistem akan memberikan hak akses <strong>Editor</strong> di Google Drive agar istri Anda bisa menambah dan mengedit baris.
              </p>

              <form onSubmit={handleShareWithWife} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={wifeEmail}
                    onChange={(e) => setWifeEmail(e.target.value)}
                    placeholder="istri@gmail.com"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSharing}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                  >
                    {isSharing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                    <span>{isSharing ? 'Memproses...' : 'Kirim Akses'}</span>
                  </button>
                </div>
                <div className="text-[11px] pt-0.5">
                  {!currentUser ? (
                    <span className="text-amber-700 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 shrink-0" />
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
              </form>

              {wifeShareSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{wifeShareSuccess}</span>
                </div>
              )}
            </div>

            {/* Step 2: Open on Wife's phone */}
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="font-bold text-xs text-slate-800">
                  Buka Aplikasi di HP Istri
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Istri cukup membuka alamat website <strong>CatatBelanja</strong> di browser HP miliknya (Chrome / Safari), lalu login dengan akun Google-nya yang sudah diizinkan.
              </p>

              {spreadsheetUrl && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={spreadsheetUrl}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 font-mono select-all truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Tersalin' : 'Salin URL'}</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCopyWhatsApp}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                  >
                    {copiedWhatsAppMsg ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedWhatsAppMsg ? 'Pesan WhatsApp Tersalin!' : 'Salin Pesan Ajakan WhatsApp ke Istri'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Step 3: Two-Way Synchronization Tips */}
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="font-bold text-xs text-slate-800">
                  Sinkronisasi Dua Arah Otomatis
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Setiap kali Anda atau istri menekan tombol <strong>"Kirim Data Lokal ke Sheets"</strong> atau <strong>"Tarik Catatan dari Sheets"</strong>, kedua ponsel akan langsung melihat total pengeluaran dan riwayat belanja yang sama persis!
              </p>
            </div>

          </div>

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
