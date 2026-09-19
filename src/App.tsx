import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SpreadsheetView } from './components/SpreadsheetView';
import { AnalyticsView } from './components/AnalyticsView';
import { BankIntegrationView } from './components/BankIntegrationView';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { ManualInputModal } from './components/ManualInputModal';
import { ReminderSettingsModal } from './components/ReminderSettingsModal';
import { PdfExportModal } from './components/PdfExportModal';
import { ExpenseItem, DailyReminderConfig, BankMutation } from './types';
import { INITIAL_EXPENSE_ITEMS, DEFAULT_REMINDER_CONFIG } from './data/sampleData';
import { Camera, Plus, Bell } from 'lucide-react';

export default function App() {
  // Load expenses from local persistence or initial sample data
  const [items, setItems] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem('catatbelanja_items');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading saved items:', e);
    }
    return INITIAL_EXPENSE_ITEMS;
  });

  // Reminder settings state
  const [reminderConfig, setReminderConfig] = useState<DailyReminderConfig>(() => {
    try {
      const saved = localStorage.getItem('catatbelanja_reminder');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading reminder config:', e);
    }
    return DEFAULT_REMINDER_CONFIG;
  });

  // Active view tab
  const [activeTab, setActiveTab] = useState<'spreadsheet' | 'analytics' | 'bank'>('spreadsheet');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  // In-app alert banner
  const [bannerAlert, setBannerAlert] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showAlert = (message: string, type: 'success' | 'info' = 'success') => {
    setBannerAlert({ message, type });
    setTimeout(() => setBannerAlert(null), 4000);
  };

  // Sync to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('catatbelanja_items', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist items:', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('catatbelanja_reminder', JSON.stringify(reminderConfig));
    } catch (e) {
      console.error('Failed to persist reminder:', e);
    }
  }, [reminderConfig]);

  // Daily Reminder Scheduler Check
  useEffect(() => {
    if (!reminderConfig.enabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      const todayStr = now.toISOString().split('T')[0];
      const lastNotifiedDay = localStorage.getItem('catatbelanja_last_notified');

      if (currentTimeStr === reminderConfig.reminderTime && lastNotifiedDay !== todayStr) {
        localStorage.setItem('catatbelanja_last_notified', todayStr);

        // Web Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🔔 CatatBelanja: Waktunya Mencatat Belanjaan!', {
              body: 'Halo! Luangkan 1 menit untuk mencatat bon atau pengeluaran hari ini.',
              icon: '/favicon.ico',
            });
          } catch (err) {
            console.error(err);
          }
        }

        showAlert('🔔 Pengingat Harian: Jangan lupa catat seluruh transaksi belanja hari ini!', 'info');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [reminderConfig]);

  // Handlers
  const handleAddItems = (newItems: ExpenseItem[]) => {
    setItems((prev) => [...newItems, ...prev]);
    showAlert(`Berhasil menambahkan ${newItems.length} item ke spreadsheet real-time!`);
  };

  const handleUpdateItem = (id: string, field: keyof ExpenseItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    showAlert('Item belanja berhasil dihapus dari spreadsheet.');
  };

  const handleAddNewRow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newBlankItem: ExpenseItem = {
      id: `manual-${Date.now()}`,
      date: today,
      time: '12:00',
      storeName: 'Toko Baru',
      itemName: 'Item Belanjaan',
      category: 'Kebutuhan Pokok',
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      totalPrice: 10000,
      paymentMethod: 'QRIS Mandiri',
      receiptNumber: '-',
      source: 'MANUAL',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [newBlankItem, ...prev]);
    showAlert('Baris baru ditambahkan ke spreadsheet!');
  };

  const handleImportBankMutation = (mutation: BankMutation) => {
    const refNo = mutation.referenceNumber || '-';
    const importedItem: ExpenseItem = {
      id: `bank-import-${mutation.id}-${Date.now()}`,
      date: mutation.date,
      time: mutation.time,
      storeName: mutation.storeSuggestion || 'Merchant Bank',
      itemName: mutation.description,
      category: mutation.categorySuggestion || 'Kebutuhan Pokok',
      quantity: 1,
      unitPrice: mutation.amount,
      discount: 0,
      totalPrice: mutation.amount,
      paymentMethod: mutation.bank.includes('MANDIRI') ? 'QRIS Mandiri' : 'Debit BCA',
      receiptNumber: refNo,
      source: 'BANK_SYNC',
      notes: `Sinkronisasi Otomatis Mutasi Rekening ${mutation.bank} (Ref: ${refNo})`,
      createdAt: new Date().toISOString(),
    };

    setItems((prev) => [importedItem, ...prev]);
    showAlert(`Mutasi ${mutation.description} berhasil diimpor ke spreadsheet!`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenManualModal={() => setIsManualOpen(true)}
        onOpenScannerModal={() => setIsScannerOpen(true)}
        onOpenReminderModal={() => setIsReminderOpen(true)}
        onOpenPdfModal={() => setIsPdfOpen(true)}
        reminderConfig={reminderConfig}
        totalItemsCount={items.length}
      />

      {/* In-app Toast Banner */}
      {bannerAlert && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 w-full">
          <div
            className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between shadow-2xs animate-fadeIn ${
              bannerAlert.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <span>{bannerAlert.message}</span>
            <button
              onClick={() => setBannerAlert(null)}
              className="text-slate-400 hover:text-slate-700 ml-3"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Main View Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'spreadsheet' && (
          <SpreadsheetView
            items={items}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddNewRow={handleAddNewRow}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenManual={() => setIsManualOpen(true)}
            onOpenBankSync={() => setActiveTab('bank')}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView items={items} />
        )}

        {activeTab === 'bank' && (
          <BankIntegrationView onImportMutation={handleImportBankMutation} />
        )}
      </main>

      {/* Modals */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddItems={handleAddItems}
      />

      <ManualInputModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onAddItems={handleAddItems}
      />

      <ReminderSettingsModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        config={reminderConfig}
        onUpdateConfig={setReminderConfig}
      />

      <PdfExportModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        items={items}
      />

      {/* Floating Action Button (FAB) on Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2.5 sm:hidden z-20">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center shadow-emerald-600/40"
          title="Scan Foto Bon"
        >
          <Camera className="w-6 h-6" />
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>CatatBelanja &bull; Solusi Cerdas Pencatatan Pengeluaran & Bon Belanjaan Indonesia</p>
          <div className="flex items-center gap-3 font-medium text-slate-600">
            <span>Gemini AI OCR</span>
            <span>&bull;</span>
            <span>Real-time Spreadsheet</span>
            <span>&bull;</span>
            <span>Open Banking Sync</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
