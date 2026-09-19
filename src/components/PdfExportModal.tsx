import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  FileDown, 
  Receipt, 
  Calendar, 
  CheckCircle2, 
  Sparkles,
  Building,
  CreditCard
} from 'lucide-react';
import { ExpenseItem } from '../types';
import { formatRupiah } from '../data/sampleData';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ExpenseItem[];
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const [reportTitle, setReportTitle] = useState('Laporan Riwayat Belanja & Pengeluaran');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Filter items for report
  const reportItems = items.filter((item) =>
    selectedMonth === 'ALL' ? true : item.date.startsWith(selectedMonth)
  );

  const totalExpense = reportItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalSavings = reportItems.reduce((sum, item) => sum + (item.discount || 0), 0);
  const totalQuantity = reportItems.reduce((sum, item) => sum + item.quantity, 0);

  // Group by category for summary
  const categorySummary = reportItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.totalPrice;
    return acc;
  }, {} as Record<string, number>);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div 
        id="modal-pdf-export"
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[92vh] print:max-h-none print:my-0 print:shadow-none print:border-none"
      >
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ekspor Laporan Pengeluaran ke Format PDF
              </h3>
              <p className="text-xs text-slate-500">
                Pratinjau dokumen siap cetak atau disimpan langsung sebagai PDF via dialog cetak browser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-print-pdf-dialog"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Unduh PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar (Hidden in Print) */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Periode Laporan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium outline-hidden"
            >
              <option value="2026-09">September 2026</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="ALL">Semua Periode Transaksi</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="font-semibold text-slate-600">Judul Dokumen:</span>
            <input
              type="text"
              value={reportTitle ?? ''}
              onChange={(e) => setReportTitle(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium outline-hidden"
            />
          </div>
        </div>

        {/* Printable Document Preview */}
        <div 
          ref={printAreaRef}
          className="p-8 overflow-y-auto flex-1 bg-white space-y-6 text-slate-900 font-sans print:p-4"
        >
          {/* Document Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-emerald-600" />
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  CATATBELANJA INDONESIA
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sistem Pencatatan Finansial Cerdas & Rekapitulasi Pembelanjaan
              </p>
              <h2 className="text-base font-extrabold text-slate-800 mt-2">
                {reportTitle}
              </h2>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Periode: <strong className="text-slate-800">{selectedMonth === 'ALL' ? 'Semua Periode' : selectedMonth}</strong></p>
              <p>Tanggal Cetak: <strong className="text-slate-800">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
              <p>Total Item: <strong className="text-slate-800">{reportItems.length} Transaksi ({totalQuantity} pcs)</strong></p>
            </div>
          </div>

          {/* Executive Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Nilai Belanja
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {formatRupiah(totalExpense)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Total riil setelah diskon
              </span>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Total Penghematan Diskon
              </span>
              <span className="text-xl font-black text-emerald-700 mt-1 block">
                {formatRupiah(totalSavings)}
              </span>
              <span className="text-[10px] text-emerald-700 mt-0.5 block">
                Potongan harga / diskon toko
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Kategori Terbesar
              </span>
              <span className="text-sm font-extrabold text-slate-800 mt-1 block truncate">
                {Object.entries(categorySummary).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {formatRupiah(Object.entries(categorySummary).sort((a, b) => b[1] - a[1])[0]?.[1] || 0)}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Rincian Item Belanjaan ({reportItems.length} Baris)
            </h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-2.5 border-r border-slate-300 w-8 text-center">No</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 w-24">Tanggal</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 w-32">Toko</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Nama Item</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 w-28">Kategori</th>
                  <th className="py-2 px-1.5 border-r border-slate-300 w-10 text-center">Qty</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 w-20 text-right">Harga</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-16 text-right">Diskon</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 w-24 text-right">Total (Rp)</th>
                  <th className="py-2 px-2.5 w-24">Metode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700 font-mono">
                      {item.date}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 font-medium text-slate-800">
                      {item.storeName}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 font-medium text-slate-900">
                      {item.itemName}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-600 text-[11px]">
                      {item.category}
                    </td>
                    <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-semibold">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-mono text-slate-700">
                      {formatRupiah(item.unitPrice)}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-emerald-700">
                      {item.discount > 0 ? `-${formatRupiah(item.discount)}` : '-'}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-bold font-mono text-slate-900">
                      {formatRupiah(item.totalPrice)}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 text-[11px]">
                      {item.paymentMethod}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 border-r border-slate-300 text-right uppercase tracking-wider text-[11px]">
                    TOTAL KESELURUHAN:
                  </td>
                  <td className="py-2.5 px-1.5 border-r border-slate-300 text-center font-mono">
                    {totalQuantity}
                  </td>
                  <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono">
                    —
                  </td>
                  <td className="py-2.5 px-2 border-r border-slate-300 text-right font-mono text-emerald-700">
                    {formatRupiah(totalSavings)}
                  </td>
                  <td className="py-2.5 px-2.5 border-r border-slate-300 text-right font-mono text-emerald-800 text-sm">
                    {formatRupiah(totalExpense)}
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-500 text-[10px] font-normal">
                    Laporan Sah
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <p>Dihasilkan secara otomatis oleh CatatBelanja AI & Real-Time Spreadsheet Engine</p>
            <p>Halaman 1 dari 1</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            Tips: Gunakan opsi &quot;Save as PDF&quot; pada menu printer browser untuk menyimpan file PDF.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-medium transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs shadow-emerald-600/20 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Buka Dialog Cetak / Unduh PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
