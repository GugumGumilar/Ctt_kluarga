import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Sparkles,
  ShoppingBag,
  Target
} from 'lucide-react';
import { ExpenseItem } from '../types';
import { CATEGORY_COLORS, formatRupiah } from '../data/sampleData';

interface AnalyticsViewProps {
  items: ExpenseItem[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ items }) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [budgetLimit, setBudgetLimit] = useState(2500000); // 2.5 Juta Rp
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Filter items by month
  const monthlyItems = useMemo(() => {
    return items.filter((item) => item.date.startsWith(selectedMonth));
  }, [items, selectedMonth]);

  // Aggregate monthly total
  const monthlyTotal = useMemo(() => {
    return monthlyItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [monthlyItems]);

  const monthlySavings = useMemo(() => {
    return monthlyItems.reduce((sum, item) => sum + (item.discount || 0), 0);
  }, [monthlyItems]);

  // Daily Spending for current month
  const dailySpendingData = useMemo(() => {
    const map: Record<string, number> = {};
    monthlyItems.forEach((item) => {
      const day = item.date.split('-')[2];
      map[day] = (map[day] || 0) + item.totalPrice;
    });

    return Object.entries(map)
      .map(([day, total]) => ({
        day: `Tgl ${day}`,
        total,
      }))
      .sort((a, b) => parseInt(a.day.replace('Tgl ', '')) - parseInt(b.day.replace('Tgl ', '')));
  }, [monthlyItems]);

  // Category Distribution
  const categoryData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    monthlyItems.forEach((item) => {
      if (!map[item.category]) {
        map[item.category] = { total: 0, count: 0 };
      }
      map[item.category].total += item.totalPrice;
      map[item.category].count += item.quantity;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        value: data.total,
        count: data.count,
        percentage: monthlyTotal > 0 ? Math.round((data.total / monthlyTotal) * 100) : 0,
        color: CATEGORY_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyItems, monthlyTotal]);

  // Payment Method Breakdown
  const paymentMethodData = useMemo(() => {
    const map: Record<string, number> = {};
    monthlyItems.forEach((item) => {
      map[item.paymentMethod] = (map[item.paymentMethod] || 0) + item.totalPrice;
    });

    return Object.entries(map)
      .map(([name, total]) => ({
        name,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthlyItems]);

  // Top 5 Highest Value Items
  const topItems = useMemo(() => {
    return [...monthlyItems]
      .sort((a, b) => b.totalPrice - a.totalPrice)
      .slice(0, 5);
  }, [monthlyItems]);

  // Budget progress
  const budgetPercentage = Math.min(100, Math.round((monthlyTotal / budgetLimit) * 100));
  const remainingBudget = Math.max(0, budgetLimit - monthlyTotal);

  return (
    <div className="space-y-6">
      
      {/* Month Selector and Budget Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Analisis Pengeluaran Bulanan
            </h3>
            <p className="text-xs text-slate-500">
              Evaluasi riwayat belanja, efisiensi anggaran, dan tren harian
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 outline-hidden"
            >
              <option value="2026-09">September 2026 (Bulan Ini)</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-07">Juli 2026</option>
            </select>
          </div>

          {/* Target Anggaran */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Target Anggaran:</span>
            <input
              type="number"
              step="100000"
              value={budgetLimit ?? 0}
              onChange={(e) => setBudgetLimit(Number(e.target.value) || 1000000)}
              className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-semibold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Overview Cards & Budget Meter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Expense */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Pengeluaran Bulan Ini</span>
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {formatRupiah(monthlyTotal)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold">
              +{formatRupiah(monthlySavings)}
            </span>
            <span>Total hemat dari promo & diskon</span>
          </div>
        </div>

        {/* Budget Meter */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Pemakaian Anggaran Bulanan</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-indigo-700">
              {budgetPercentage}%
            </span>
            <span className="text-xs text-slate-500">
              Limit: {formatRupiah(budgetLimit)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPercentage > 90
                  ? 'bg-rose-500'
                  : budgetPercentage > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${budgetPercentage}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Sisa anggaran aman: <strong>{formatRupiah(remainingBudget)}</strong>
          </p>
        </div>

        {/* Total Purchases Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Frekuensi & Rata-rata</span>
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {monthlyItems.length} <span className="text-base font-semibold text-slate-500">Item</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Rata-rata pengeluaran per item:{' '}
            <strong className="text-slate-800">
              {formatRupiah(monthlyItems.length > 0 ? Math.round(monthlyTotal / monthlyItems.length) : 0)}
            </strong>
          </p>
        </div>
      </div>

      {/* Main Charts: Daily Trend & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Spending Trend (2 cols) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Tren Pengeluaran Harian
              </h4>
              <p className="text-xs text-slate-500">
                Pola pengeluaran harian sepanjang bulan {selectedMonth}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartType === 'area' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartType === 'bar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Batang
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={dailySpendingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(val: any) => [formatRupiah(Number(val)), 'Pengeluaran']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#spendingGradient)" />
                </AreaChart>
              ) : (
                <BarChart data={dailySpendingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(val: any) => [formatRupiah(Number(val)), 'Pengeluaran']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }}
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Donut Chart (1 col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-blue-600" />
              Distribusi Kategori
            </h4>
            <p className="text-xs text-slate-500 mb-2">
              Komposisi pengeluaran per jenis kebutuhan
            </p>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => [formatRupiah(Number(val)), 'Total']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown legend list */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
            {categoryData.slice(0, 5).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                  <span className="font-medium text-slate-800 truncate max-w-[130px]">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500">{cat.percentage}%</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(cat.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Secondary Row: Payment Methods & Top Expensive Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Payment Methods Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h4 className="text-sm font-bold text-slate-900 mb-1">
            Metode Pembayaran Paling Sering Digunakan
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            Distribusi pemakaian QRIS, Debit Bank, Dompet Digital & Tunai
          </p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip 
                  formatter={(val: any) => [formatRupiah(Number(val)), 'Total Pembayaran']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Items */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              5 Item Pengeluaran Terbesar Bulan Ini
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Item belanjaan dengan nominal transaksi tertinggi
            </p>
          </div>

          <div className="space-y-2.5">
            {topItems.map((item, idx) => (
              <div key={item.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{item.itemName}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.storeName} &bull; {item.quantity} pcs &bull; {item.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{formatRupiah(item.totalPrice)}</span>
                  {item.discount > 0 && (
                    <span className="text-[10px] text-emerald-600">Hemat {formatRupiah(item.discount)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 text-center text-xs text-slate-400">
            Terhubung otomatis dengan spreadsheet real-time
          </div>
        </div>

      </div>

    </div>
  );
};
