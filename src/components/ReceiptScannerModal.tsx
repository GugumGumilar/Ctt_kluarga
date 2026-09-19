import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Sparkles, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Receipt,
  FileCheck,
  Store,
  CreditCard,
  Calendar,
  Layers
} from 'lucide-react';
import { ExpenseItem, ReceiptScanResult } from '../types';
import { formatRupiah } from '../data/sampleData';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: ExpenseItem[]) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onAddItems,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  if (!isOpen) return null;

  // Start live webcam/camera
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setErrorMsg('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
      setIsCameraActive(false);
    }
  };

  // Capture frame from live video
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelectedImage(dataUrl);
      stopCamera();
      processOcrImage(dataUrl);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // File upload change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      processOcrImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Call Server-Side Gemini API OCR
  const processOcrImage = async (base64Image: string) => {
    setIsScanning(true);
    setErrorMsg(null);
    setScanResult(null);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses struk.');
      }

      const raw = data.data || {};
      const normalized: ReceiptScanResult = {
        storeName: raw.storeName || 'Merchant Belanja',
        date: raw.date || new Date().toISOString().split('T')[0],
        time: raw.time || '12:00',
        receiptNo: raw.receiptNo || '',
        category: raw.category || 'Belanja Harian',
        paymentMethod: raw.paymentMethod || 'QRIS / Tunai',
        items: (raw.items || []).map((it: any) => ({
          name: it.name || 'Item Belanja',
          qty: Number(it.qty) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
          totalPrice: Number(it.totalPrice) || Math.max(0, (Number(it.qty) || 1) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0)),
          category: it.category || raw.category || 'Belanja Harian',
        })),
        subtotal: Number(raw.subtotal) || 0,
        discountTotal: Number(raw.discountTotal) || 0,
        tax: Number(raw.tax) || 0,
        totalAmount: Number(raw.totalAmount) || 0,
        notes: raw.notes || '',
      };

      setScanResult(normalized);
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsScanning(false);
    }
  };

  // Quick preset matching user's uploaded AEON Delta Mas photo
  const loadAeonSampleReceipt = () => {
    stopCamera();
    setSelectedImage('/assets/sample_receipt_icon.png'); // placeholder preview
    setIsScanning(true);
    setErrorMsg(null);

    // Simulate instant AI scan matching the uploaded photo
    setTimeout(() => {
      setScanResult({
        storeName: 'AEON Delta Mas',
        date: '2026-09-19',
        time: '20:22',
        receiptNo: '0320436',
        category: 'Roti & Bakery / Groceries',
        paymentMethod: 'QRIS MANDIRI',
        items: [
          {
            name: 'BANANA CAKE SLI',
            qty: 1,
            unitPrice: 13000,
            discount: 650,
            totalPrice: 12350,
            category: 'Roti & Bakery',
          },
          {
            name: 'CHOCO FUDGE COO',
            qty: 1,
            unitPrice: 13500,
            discount: 675,
            totalPrice: 12825,
            category: 'Roti & Bakery',
          },
          {
            name: 'ANEKA ROTI CURA (2 pcs)',
            qty: 2,
            unitPrice: 6000,
            discount: 600,
            totalPrice: 11400,
            category: 'Roti & Bakery',
          },
          {
            name: 'ANEKA ROTI CURA',
            qty: 1,
            unitPrice: 3000,
            discount: 150,
            totalPrice: 2850,
            category: 'Roti & Bakery',
          },
        ],
        subtotal: 39425,
        discountTotal: 2075,
        tax: 3907,
        totalAmount: 39425,
        notes: 'Struk Stempel Aeon Card Disc 5% - Kasir 8001001',
      });
      setIsScanning(false);
    }, 700);
  };

  // Modify item in scanned result table
  const handleItemChange = (index: number, field: string, value: any) => {
    if (!scanResult) return;
    const updatedItems = [...scanResult.items];
    const targetItem = { ...updatedItems[index], [field]: value };

    if (field === 'qty' || field === 'unitPrice' || field === 'discount') {
      const qty = Number(field === 'qty' ? value : targetItem.qty) || 0;
      const unit = Number(field === 'unitPrice' ? value : targetItem.unitPrice) || 0;
      const disc = Number(field === 'discount' ? value : targetItem.discount) || 0;
      targetItem.totalPrice = Math.max(0, qty * unit - disc);
    }

    updatedItems[index] = targetItem;
    const newTotal = updatedItems.reduce((sum, it) => sum + it.totalPrice, 0);

    setScanResult({
      ...scanResult,
      items: updatedItems,
      totalAmount: newTotal,
    });
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    if (!scanResult) return;
    const updatedItems = scanResult.items.filter((_, i) => i !== index);
    const newTotal = updatedItems.reduce((sum, it) => sum + it.totalPrice, 0);
    setScanResult({
      ...scanResult,
      items: updatedItems,
      totalAmount: newTotal,
    });
  };

  // Add extra row
  const handleAddBlankItem = () => {
    if (!scanResult) return;
    setScanResult({
      ...scanResult,
      items: [
        ...scanResult.items,
        {
          name: 'Item Baru',
          qty: 1,
          unitPrice: 10000,
          discount: 0,
          totalPrice: 10000,
          category: scanResult.category || 'Roti & Bakery',
        },
      ],
    });
  };

  // Confirm and insert to spreadsheet
  const handleConfirmAndSave = () => {
    if (!scanResult || scanResult.items.length === 0) return;

    const newExpenseItems: ExpenseItem[] = scanResult.items.map((item, idx) => ({
      id: `ocr-${Date.now()}-${idx}`,
      date: scanResult.date || new Date().toISOString().split('T')[0],
      time: scanResult.time || '12:00',
      storeName: scanResult.storeName || 'Merchant Tanpa Nama',
      itemName: item.name,
      category: item.category || 'Belanja Harian',
      quantity: Number(item.qty) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      discount: Number(item.discount) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      paymentMethod: scanResult.paymentMethod || 'QRIS',
      receiptNumber: scanResult.receiptNo || '-',
      source: 'OCR_PHOTO',
      notes: scanResult.notes || 'Scan Foto AI',
      createdAt: new Date().toISOString(),
    }));

    onAddItems(newExpenseItems);
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    setSelectedImage(null);
    setScanResult(null);
    setIsScanning(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        id="modal-receipt-scanner"
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Scan Bon Belanjaan (AI OCR)
                <span className="px-2 py-0.5 text-xs rounded-md bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gemini 3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Konversi otomatis foto struk/bon belanja menjadi data tabel terstruktur
              </p>
            </div>
          </div>
          <button
            id="btn-close-scanner-modal"
            onClick={handleClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Quick preset banner for the uploaded receipt */}
          <div className="p-3.5 bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Receipt className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-emerald-900">
                  Struk Bon: AEON Delta Mas (Foto Yang Diunggah)
                </p>
                <p className="text-xs text-emerald-700">
                  Banana Cake, Choco Fudge, Aneka Roti Cura (QRIS Mandiri Rp 39.425)
                </p>
              </div>
            </div>
            <button
              id="btn-use-aeon-sample"
              onClick={loadAeonSampleReceipt}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Uji Coba Struk Ini
            </button>
          </div>

          {/* Camera Viewfinder if Active */}
          {isCameraActive && (
            <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                playsInline 
                muted
              />
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-emerald-400/70 m-8 rounded-lg flex items-center justify-center">
                <span className="bg-slate-900/70 text-emerald-300 text-xs px-3 py-1 rounded-full">
                  Posisikan bon di dalam bingkai
                </span>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <button
                  id="btn-capture-camera"
                  onClick={capturePhoto}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold text-sm shadow-lg flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Ambil Foto Bon
                </button>
                <button
                  id="btn-cancel-camera"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Image Upload Area if not viewing scanned result */}
          {!scanResult && !isCameraActive && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-emerald-600 group-hover:border-emerald-300 transition-colors">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Klik untuk unggah foto struk / bon belanja
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Mendukung format JPG, PNG, WEBP (foto struk supermarket, resto, minimarket)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  id="btn-open-camera"
                  onClick={startCamera}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium transition-colors"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Gunakan Kamera Ponsel / Webcam
                </button>
              </div>
            </div>
          )}

          {/* Scanning In-Progress Skeleton Animation */}
          {isScanning && (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="w-12 h-12 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  AI Sedang Membaca & Mengekstrak Item Bon...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mendeteksi nama toko, tanggal, item belanjaan, harga, diskon Aeon, dan metode bayar
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Pemindaian Struk Gagal</p>
                <p className="mt-0.5 text-rose-700">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Scanned Result Review Table */}
          {scanResult && !isScanning && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Receipt Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                    <Store className="w-3.5 h-3.5 text-slate-400" /> Toko / Merchant
                  </label>
                  <input
                    type="text"
                    value={scanResult.storeName ?? ''}
                    onChange={(e) => setScanResult({ ...scanResult, storeName: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal
                  </label>
                  <input
                    type="date"
                    value={scanResult.date ?? ''}
                    onChange={(e) => setScanResult({ ...scanResult, date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Metode Bayar
                  </label>
                  <input
                    type="text"
                    value={scanResult.paymentMethod ?? ''}
                    onChange={(e) => setScanResult({ ...scanResult, paymentMethod: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> No. Struk
                  </label>
                  <input
                    type="text"
                    value={scanResult.receiptNo ?? ''}
                    onChange={(e) => setScanResult({ ...scanResult, receiptNo: e.target.value })}
                    placeholder="No Struk"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    Daftar Item Belanjaan Terdeteksi ({scanResult.items.length} item)
                  </h4>
                  <button
                    onClick={handleAddBlankItem}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Nama Item</th>
                        <th className="py-2.5 px-2 w-28">Kategori</th>
                        <th className="py-2.5 px-2 w-14 text-center">Qty</th>
                        <th className="py-2.5 px-2 w-24 text-right">Harga (Rp)</th>
                        <th className="py-2.5 px-2 w-20 text-right">Diskon</th>
                        <th className="py-2.5 px-3 w-28 text-right">Total (Rp)</th>
                        <th className="py-2.5 px-2 w-10 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {scanResult.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.name ?? ''}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              className="w-full bg-transparent border-0 border-b border-transparent focus:border-emerald-500 font-medium text-slate-900 text-xs px-1 py-0.5 outline-hidden"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.category ?? ''}
                              onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                              className="w-full bg-slate-100 rounded px-1.5 py-0.5 text-[11px] text-slate-700 outline-hidden border border-slate-200"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.qty ?? 1}
                              onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                              className="w-12 bg-transparent text-center border border-slate-200 rounded px-1 py-0.5 text-xs font-semibold outline-hidden"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              value={item.unitPrice ?? 0}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                              className="w-20 bg-transparent text-right border border-slate-200 rounded px-1 py-0.5 text-xs font-medium outline-hidden"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              value={item.discount ?? 0}
                              onChange={(e) => handleItemChange(idx, 'discount', Number(e.target.value))}
                              className="w-16 bg-emerald-50 text-emerald-700 text-right border border-emerald-200 rounded px-1 py-0.5 text-xs font-medium outline-hidden"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            {formatRupiah(item.totalPrice)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Hapus item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals and Savings footer */}
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">
                      Subtotal: <strong>{formatRupiah(scanResult.subtotal || scanResult.totalAmount)}</strong>
                    </span>
                    {scanResult.discountTotal > 0 && (
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-semibold">
                        Hemat Diskon: -{formatRupiah(scanResult.discountTotal)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Total Pembayaran: <span className="text-emerald-700 text-base">{formatRupiah(scanResult.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {scanResult ? (
            <button
              onClick={() => {
                setScanResult(null);
                setSelectedImage(null);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Scan Bon Lain
            </button>
          ) : (
            <span className="text-xs text-slate-500">Pilih foto bon untuk memulai ekstraksi OCR</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-medium transition-colors"
            >
              Batal
            </button>
            {scanResult && (
              <button
                id="btn-save-scanned-items"
                onClick={handleConfirmAndSave}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs shadow-emerald-600/20 transition-colors"
              >
                <Check className="w-4 h-4" />
                Simpan ke Spreadsheet ({scanResult.items.length} Item)
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
