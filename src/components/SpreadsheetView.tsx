import React, { useState } from 'react';
import { 
  Table, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowUpDown, 
  ExternalLink,
  Sparkles,
  Camera,
  Landmark,
  FileSpreadsheet,
  Edit3,
  Copy
} from 'lucide-react';
import { ExpenseItem } from '../types';
import { CATEGORIES, PAYMENT_METHODS, formatRupiah } from '../data/sampleData';

interface SpreadsheetViewProps {
  items: ExpenseItem[];
  onUpdateItem: (id: string, field: keyof ExpenseItem, value: any) => void;
  onDeleteItem: (id: string) => void;
  onAddNewRow: () => void;
  onOpenScanner: () => void;
  onOpenManual: () => void;
  onOpenBankSync: () => void;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onAddNewRow,
  onOpenScanner,
  onOpenManual,
  onOpenBankSync,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [sortField, setSortField] = useState<'date' | 'totalPrice' | 'storeName' | 'itemName'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof ExpenseItem } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'Semua Kategori' || item.category === selectedCategory;

    const matchesSource =
      selectedSource === 'ALL' || item.source === selectedSource;

    return matchesSearch && matchesCategory && matchesSource;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'date') {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }

    return 0;
  });

  const toggleSort = (field: 'date' | 'totalPrice' | 'storeName' | 'itemName') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Aggregates
  const totalAmount = sortedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalDiscount = sortedItems.reduce((sum, item) => sum + (item.discount || 0), 0);
  const totalQuantity = sortedItems.reduce((sum, item) => sum + item.quantity, 0);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Tanggal', 'Waktu', 'Toko/Merchant', 'Kategori', 'Nama Item', 'Qty', 'Harga Satuan', 'Diskon', 'Total Harga', 'Metode Pembayaran', 'Sumber', 'Catatan'];
    const rows = sortedItems.map((item) => [
      item.id,
      item.date,
      item.time || '',
      `"${item.storeName.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.itemName.replace(/"/g, '""')}"`,
      item.quantity,
      item.unitPrice,
      item.discount,
      item.totalPrice,
      `"${item.paymentMethod}"`,
      item.source,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CatatBelanja_Spreadsheet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV Spreadsheet berhasil diunduh!');
  };

  // Copy as Google Sheets format
  const handleCopyForSheets = () => {
    const headers = ['Tanggal', 'Toko', 'Kategori', 'Nama Item', 'Qty', 'Harga Satuan', 'Diskon', 'Total', 'Metode Bayar', 'Catatan'];
    const tsv = [
      headers.join('\t'),
      ...sortedItems.map((it) =>
        [it.date, it.storeName, it.category, it.itemName, it.quantity, it.unitPrice, it.discount, it.totalPrice, it.paymentMethod, it.notes || ''].join('\t')
      ),
    ].join('\n');

    navigator.clipboard.writeText(tsv);
    showToast('Disalin ke clipboard! Siap di-paste langsung ke Google Sheets / Excel.');
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Metrics Cards (Auto-SUM Calculation Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Pengeluaran
          </span>
          <span className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1 block">
            {formatRupiah(totalAmount)}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> Real-time sum dari {sortedItems.length} transaksi
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Item Belanjaan
          </span>
          <span className="text-lg sm:text-2xl font-extrabold text-indigo-700 mt-1 block">
            {totalQuantity} <span className="text-sm font-semibold text-slate-500">pcs</span>
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Rata-rata {formatRupiah(sortedItems.length > 0 ? Math.round(totalAmount / sortedItems.length) : 0)}/transaksi
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Penghematan Diskon
          </span>
          <span className="text-lg sm:text-2xl font-extrabold text-emerald-600 mt-1 block">
            {formatRupiah(totalDiscount)}
          </span>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium inline-block mt-0.5">
            Diskon member & promo
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Sumber Data
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold flex items-center gap-1">
              <Camera className="w-3 h-3" /> OCR: {items.filter((i) => i.source === 'OCR_PHOTO').length}
            </span>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-xs font-bold">
              Manual: {items.filter((i) => i.source === 'MANUAL').length}
            </span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-xs font-bold flex items-center gap-1">
              <Landmark className="w-3 h-3" /> Bank: {items.filter((i) => i.source === 'BANK_SYNC').length}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Sinkron otomatis real-time
          </span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-spreadsheet-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama item, toko, catatan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg outline-hidden focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <select
            id="select-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-hidden font-medium"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            id="select-source-filter"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-hidden font-medium"
          >
            <option value="ALL">Semua Sumber</option>
            <option value="OCR_PHOTO">📸 Scan Foto Bon</option>
            <option value="MANUAL">✏️ Input Manual</option>
            <option value="BANK_SYNC">🏦 Mutasi Bank</option>
          </select>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-spreadsheet-add-row"
            onClick={onAddNewRow}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
            title="Tambah baris kosong langsung ke spreadsheet"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tambah Baris</span>
          </button>

          <button
            id="btn-copy-sheets"
            onClick={handleCopyForSheets}
            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-300 shadow-2xs"
            title="Salin untuk Google Sheets / Excel"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Salin ke Sheets</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Spreadsheet Grid Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {/* Spreadsheet Status banner */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-800">
              Lembar Kerja Spreadsheet (Live Editable)
            </span>
            <span className="text-slate-400">|</span>
            <span>Klik pada sel mana saja untuk mengedit data secara instan</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            {sortedItems.length} dari {items.length} Baris
          </span>
        </div>

        {/* The Spreadsheet Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200 bg-slate-100/60">#</th>
                <th 
                  onClick={() => toggleSort('date')}
                  className="py-2.5 px-3 w-28 border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>Tanggal</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('storeName')}
                  className="py-2.5 px-3 w-40 border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>Toko / Merchant</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 w-36 border-r border-slate-200">Kategori</th>
                <th 
                  onClick={() => toggleSort('itemName')}
                  className="py-2.5 px-3 min-w-[180px] border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>Nama Item Belanjaan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-2 w-14 text-center border-r border-slate-200">Qty</th>
                <th className="py-2.5 px-3 w-24 text-right border-r border-slate-200">Harga Satuan</th>
                <th className="py-2.5 px-3 w-20 text-right border-r border-slate-200">Diskon</th>
                <th 
                  onClick={() => toggleSort('totalPrice')}
                  className="py-2.5 px-3 w-28 text-right border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors font-bold text-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span>Total (Rp)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-200">Metode Bayar</th>
                <th className="py-2.5 px-2 w-20 text-center border-r border-slate-200">Sumber</th>
                <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-200">Catatan</th>
                <th className="py-2.5 px-2 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada item belanjaan yang cocok.</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan pencarian atau filter.</p>
                  </td>
                </tr>
              ) : (
                sortedItems.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-emerald-50/30 transition-colors group"
                  >
                    {/* Row Index */}
                    <td className="py-2 px-2 text-center text-slate-400 border-r border-slate-200 font-mono text-[11px] bg-slate-50/50">
                      {index + 1}
                    </td>

                    {/* Date */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="date"
                        value={item.date ?? ''}
                        onChange={(e) => onUpdateItem(item.id, 'date', e.target.value)}
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-1 text-slate-800 text-xs font-mono"
                      />
                    </td>

                    {/* Store Name */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={item.storeName ?? ''}
                        onChange={(e) => onUpdateItem(item.id, 'storeName', e.target.value)}
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-1 font-semibold text-slate-800 text-xs"
                      />
                    </td>

                    {/* Category */}
                    <td className="p-1 border-r border-slate-200">
                      <select
                        value={item.category ?? 'Kebutuhan Rumah'}
                        onChange={(e) => onUpdateItem(item.id, 'category', e.target.value)}
                        className="w-full bg-slate-50 border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {CATEGORIES.filter((c) => c !== 'Semua Kategori').map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Item Name */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={item.itemName ?? ''}
                        onChange={(e) => onUpdateItem(item.id, 'itemName', e.target.value)}
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-1 font-medium text-slate-900 text-xs"
                      />
                    </td>

                    {/* Qty */}
                    <td className="p-1 border-r border-slate-200 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity ?? 1}
                        onChange={(e) => {
                          const newQty = Number(e.target.value) || 1;
                          onUpdateItem(item.id, 'quantity', newQty);
                          onUpdateItem(item.id, 'totalPrice', Math.max(0, newQty * item.unitPrice - item.discount));
                        }}
                        className="w-12 text-center bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1 font-semibold text-slate-800 text-xs"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="p-1 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        step="500"
                        value={item.unitPrice ?? 0}
                        onChange={(e) => {
                          const newUnit = Number(e.target.value) || 0;
                          onUpdateItem(item.id, 'unitPrice', newUnit);
                          onUpdateItem(item.id, 'totalPrice', Math.max(0, item.quantity * newUnit - item.discount));
                        }}
                        className="w-20 text-right bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1 text-slate-800 text-xs font-mono"
                      />
                    </td>

                    {/* Discount */}
                    <td className="p-1 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        step="100"
                        value={item.discount ?? 0}
                        onChange={(e) => {
                          const newDisc = Number(e.target.value) || 0;
                          onUpdateItem(item.id, 'discount', newDisc);
                          onUpdateItem(item.id, 'totalPrice', Math.max(0, item.quantity * item.unitPrice - newDisc));
                        }}
                        className="w-16 text-right bg-emerald-50/60 text-emerald-700 border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 py-1 text-xs font-mono"
                      />
                    </td>

                    {/* Total Price */}
                    <td className="py-2 px-3 border-r border-slate-200 text-right font-extrabold text-slate-900 font-mono">
                      {formatRupiah(item.totalPrice)}
                    </td>

                    {/* Payment Method */}
                    <td className="p-1 border-r border-slate-200">
                      <select
                        value={item.paymentMethod ?? 'Tunai'}
                        onChange={(e) => onUpdateItem(item.id, 'paymentMethod', e.target.value)}
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-1 text-[11px] text-slate-700"
                      >
                        {PAYMENT_METHODS.filter((m) => m !== 'Semua Metode').map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Source Badge */}
                    <td className="py-2 px-2 text-center border-r border-slate-200">
                      {item.source === 'OCR_PHOTO' && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          📸 OCR
                        </span>
                      )}
                      {item.source === 'MANUAL' && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          ✏️ Manual
                        </span>
                      )}
                      {item.source === 'BANK_SYNC' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          🏦 Bank
                        </span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={item.notes ?? ''}
                        onChange={(e) => onUpdateItem(item.id, 'notes', e.target.value)}
                        placeholder="Tambahkan catatan..."
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-1 text-slate-500 text-xs placeholder:text-slate-300"
                      />
                    </td>

                    {/* Action */}
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors rounded"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Auto-SUM Spreadsheet Footer */}
            <tfoot className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-300 sticky bottom-0">
              <tr>
                <td colSpan={4} className="py-2.5 px-3 border-r border-slate-200 text-right uppercase tracking-wider text-[11px] text-slate-600">
                  SUM / TOTAL AKHIR ({sortedItems.length} ITEM):
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-slate-500 font-mono text-[11px]">
                  =COUNT({sortedItems.length})
                </td>
                <td className="py-2.5 px-2 border-r border-slate-200 text-center font-mono text-indigo-800">
                  {totalQuantity}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-500 text-[11px]">
                  —
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-emerald-700">
                  {formatRupiah(totalDiscount)}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-emerald-800 text-sm">
                  {formatRupiah(totalAmount)}
                </td>
                <td colSpan={4} className="py-2.5 px-3 text-slate-500 text-[11px] font-normal">
                  Kalkulasi otomatis real-time
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
