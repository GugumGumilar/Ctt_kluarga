import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Store, 
  Calendar, 
  CreditCard, 
  Tag, 
  ShoppingCart,
  FileText
} from 'lucide-react';
import { ExpenseItem } from '../types';
import { CATEGORIES, PAYMENT_METHODS, formatRupiah } from '../data/sampleData';

interface ManualInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: ExpenseItem[]) => void;
}

interface DraftItemRow {
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  notes: string;
}

export const ManualInputModal: React.FC<ManualInputModalProps> = ({
  isOpen,
  onClose,
  onAddItems,
}) => {
  const [storeName, setStoreName] = useState('Indomaret Point');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:30');
  const [paymentMethod, setPaymentMethod] = useState('QRIS Mandiri');
  const [receiptNumber, setReceiptNumber] = useState('');
  
  const [rows, setRows] = useState<DraftItemRow[]>([
    {
      itemName: 'Susu Segar Greenfield 1L',
      category: 'Makanan & Minuman',
      quantity: 1,
      unitPrice: 32000,
      discount: 0,
      notes: '',
    },
    {
      itemName: 'Roti Gandum Sari Roti',
      category: 'Roti & Bakery',
      quantity: 1,
      unitPrice: 21000,
      discount: 2000,
      notes: 'Promo member',
    },
  ]);

  if (!isOpen) return null;

  const quickStores = ['AEON Delta Mas', 'Superindo', 'Indomaret', 'Alfamart', 'Pasar Modern', 'Kopi Kenangan'];

  const handleRowChange = (index: number, field: keyof DraftItemRow, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        itemName: '',
        category: 'Kebutuhan Pokok',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        notes: '',
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const calculateRowTotal = (row: DraftItemRow) => {
    const qty = Number(row.quantity) || 0;
    const price = Number(row.unitPrice) || 0;
    const disc = Number(row.discount) || 0;
    return Math.max(0, qty * price - disc);
  };

  const grandTotal = rows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
  const totalDiscounts = rows.reduce((sum, row) => sum + (Number(row.discount) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.itemName.trim().length > 0);
    if (validRows.length === 0) return;

    const newItems: ExpenseItem[] = validRows.map((row, idx) => ({
      id: `man-${Date.now()}-${idx}`,
      date,
      time,
      storeName: storeName.trim() || 'Umum',
      itemName: row.itemName.trim(),
      category: row.category,
      quantity: Number(row.quantity) || 1,
      unitPrice: Number(row.unitPrice) || 0,
      discount: Number(row.discount) || 0,
      totalPrice: calculateRowTotal(row),
      paymentMethod,
      receiptNumber: receiptNumber.trim() || '-',
      source: 'MANUAL',
      notes: row.notes.trim() || 'Input Manual',
      createdAt: new Date().toISOString(),
    }));

    onAddItems(newItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        id="modal-manual-input"
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Input Manual Item Belanjaan
              </h3>
              <p className="text-xs text-slate-500">
                Catat satu atau banyak belanjaan sekaligus ke dalam spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            
            {/* Store & Metadata section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-semibold flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-slate-400" /> Toko / Merchant
                </label>
                <input
                  type="text"
                  required
                  value={storeName ?? ''}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Contoh: AEON Delta Mas"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {quickStores.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStoreName(s)}
                      className="text-[10px] bg-slate-200/80 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 px-1.5 py-0.5 rounded transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal & Waktu
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    required
                    value={date ?? ''}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                  <input
                    type="time"
                    value={time ?? ''}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
                >
                  {PAYMENT_METHODS.filter((m) => m !== 'Semua Metode').map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={receiptNumber ?? ''}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Nomor Struk (Opsional)"
                  className="w-full mt-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 outline-hidden"
                />
              </div>
            </div>

            {/* Items rows */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  Daftar Item Belanjaan ({rows.length} baris)
                </h4>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris Item
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Nama Item Belanja</th>
                      <th className="py-2.5 px-2 w-32">Kategori</th>
                      <th className="py-2.5 px-2 w-14 text-center">Qty</th>
                      <th className="py-2.5 px-2 w-24 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-2 w-20 text-right">Diskon</th>
                      <th className="py-2.5 px-3 w-28 text-right">Total</th>
                      <th className="py-2.5 px-2 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2">
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Roti Gandum"
                            value={row.itemName ?? ''}
                            onChange={(e) => handleRowChange(idx, 'itemName', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 font-medium focus:border-indigo-500 outline-hidden"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.category ?? 'Kebutuhan Rumah'}
                            onChange={(e) => handleRowChange(idx, 'category', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-800 outline-hidden"
                          >
                            {CATEGORIES.filter((c) => c !== 'Semua Kategori').map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity ?? 1}
                            onChange={(e) => handleRowChange(idx, 'quantity', Number(e.target.value))}
                            className="w-12 bg-white text-center border border-slate-200 rounded px-1 py-1 text-xs font-semibold outline-hidden"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={row.unitPrice ?? 0}
                            onChange={(e) => handleRowChange(idx, 'unitPrice', Number(e.target.value))}
                            className="w-20 bg-white text-right border border-slate-200 rounded px-1.5 py-1 text-xs font-medium outline-hidden"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={row.discount ?? 0}
                            onChange={(e) => handleRowChange(idx, 'discount', Number(e.target.value))}
                            className="w-16 bg-emerald-50 text-emerald-700 text-right border border-emerald-200 rounded px-1.5 py-1 text-xs font-medium outline-hidden"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {formatRupiah(calculateRowTotal(row))}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            disabled={rows.length === 1}
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total calculation footer */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="text-slate-600 flex items-center gap-2">
                  <span>Total Diskon Dihemat:</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {formatRupiah(totalDiscounts)}
                  </span>
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  Total Belanja: <span className="text-indigo-700 text-base">{formatRupiah(grandTotal)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button
              id="btn-submit-manual-items"
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs shadow-indigo-600/20 transition-colors"
            >
              <Check className="w-4 h-4" />
              Simpan ke Spreadsheet
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
