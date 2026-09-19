import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ArrowDownLeft, 
  Plus, 
  ShieldCheck, 
  ExternalLink,
  Zap,
  AlertCircle,
  Building2,
  Wallet
} from 'lucide-react';
import { BankAccount, BankMutation, ExpenseItem } from '../types';
import { formatRupiah } from '../data/sampleData';

interface BankIntegrationViewProps {
  onImportMutation: (mutation: BankMutation) => void;
}

export const BankIntegrationView: React.FC<BankIntegrationViewProps> = ({
  onImportMutation,
}) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [mutations, setMutations] = useState<BankMutation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Fetch bank accounts and mutations
  const loadBankData = async () => {
    try {
      setIsLoading(true);
      const [accRes, mutRes] = await Promise.all([
        fetch('/api/bank/accounts'),
        fetch('/api/bank/mutations'),
      ]);

      const accData = await accRes.json();
      const mutData = await mutRes.json();

      if (accData.success) setAccounts(accData.accounts);
      if (mutData.success) setMutations(mutData.mutations);
    } catch (err) {
      console.error('Error fetching bank data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBankData();
  }, []);

  // Trigger live sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    // Simulate real-time bank communication
    setTimeout(() => {
      setIsSyncing(false);
      setNotificationMsg('Sinkronisasi mutasi berhasil! 2 transaksi debit baru terdeteksi.');
      setTimeout(() => setNotificationMsg(null), 4000);
    }, 1200);
  };

  // Convert single bank mutation into an expense item
  const handleConvert = (mutation: BankMutation) => {
    onImportMutation(mutation);
    // Mark as imported in local state
    setMutations((prev) =>
      prev.map((m) => (m.id === mutation.id ? { ...m, imported: true } : m))
    );
    setNotificationMsg(`Transaksi "${mutation.description}" berhasil disinkronkan ke spreadsheet!`);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Toggle bank connection
  const handleToggleAccount = (accId: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accId ? { ...a, connected: !a.connected } : a))
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Alert toast */}
      {notificationMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs sm:text-sm font-medium animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Integrasi Open Banking & Sinkronisasi Mutasi
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> SNAP BI Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sinkronkan transaksi debit rekening Mandiri, BCA, BRI, dan QRIS secara otomatis tanpa input manual berulang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="btn-trigger-bank-sync"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs shadow-emerald-600/20 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menghubungi Bank...' : 'Tarik Mutasi Terbaru'}</span>
          </button>
        </div>
      </div>

      {/* Connected Accounts Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            Rekening Bank & Dompet Digital Terhubung ({accounts.filter((a) => a.connected).length})
          </h4>
          <span className="text-xs text-slate-500">Standar Keamanan Enkripsi 256-bit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={`p-4 rounded-xl border transition-all ${
                acc.connected
                  ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                  : 'bg-slate-50/70 border-dashed border-slate-300 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${acc.connected ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  {acc.bankName}
                </span>
                <button
                  onClick={() => handleToggleAccount(acc.id)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                    acc.connected
                      ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                >
                  {acc.connected ? 'Terhubung' : 'Hubungkan'}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mt-1">{acc.accountType}</p>
              <p className="text-xs font-mono text-slate-700 mt-0.5">{acc.accountNumber}</p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-[11px] text-slate-400">Saldo Rekening:</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">
                  {formatRupiah(acc.balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detected Debit Mutations for Expense Auto-Import */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/60">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-rose-500" />
              Mutasi Transaksi Debit Terbaru
            </h4>
            <p className="text-xs text-slate-500">
              Transaksi belanja terdeteksi dari mutasi rekening bank untuk langsung dikonversi ke spreadsheet
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            {mutations.filter((m) => !m.imported).length} Transaksi Belum Dicatat
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {mutations.map((mut) => (
            <div
              key={mut.id}
              className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors ${
                mut.imported ? 'bg-slate-50/40' : ''
              }`}
            >
              {/* Left description */}
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                  mut.imported ? 'bg-slate-200 text-slate-500' : 'bg-rose-100 text-rose-600'
                }`}>
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{mut.description}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {mut.bank}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{mut.date} {mut.time}</span>
                    <span>&bull;</span>
                    <span>Saran Toko: <strong>{mut.storeSuggestion}</strong></span>
                    <span>&bull;</span>
                    <span>Kategori: <strong>{mut.categorySuggestion}</strong></span>
                  </p>
                </div>
              </div>

              {/* Right amount and convert button */}
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                <span className="text-sm sm:text-base font-extrabold text-rose-600 font-mono">
                  -{formatRupiah(mut.amount)}
                </span>

                {mut.imported ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-semibold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Tersimpan
                  </span>
                ) : (
                  <button
                    id={`btn-convert-mut-${mut.id}`}
                    onClick={() => handleConvert(mut)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Konversi ke Belanjaan</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
