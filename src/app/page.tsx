'use client';

import React, { useEffect, useState } from 'react';
import { IndianRupee, Wallet, Gift, TrendingUp, RefreshCw, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import ImportZone from '@/components/ImportZone';
import { StatsCard } from '@/components/StatsCard';
import { SpendingPieChart, MonthlyTrendChart } from '@/components/DashboardCharts';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '1Y' | 'ALL' | 'CUSTOM'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFilteredData = () => {
    if (!data) return null;

    const now = new Date();
    const filteredTransactions = data.transactions.filter((t: any) => {
      // Honor manual failure override first
      if (t.manualStatus === 'Failed') return false;
      if (t.manualStatus === 'Completed') return true; // Force include if manually completed

      const isCompleted = t.status === 'Completed' || t.status === 'Complete' || t.status === 'GPay Activity';
      const isFailed = /failed|cancelled|declined|rejected/i.test(t.description || '');

      if (!isCompleted || isFailed) return false;

      const d = new Date(t.time);

      // Time Range Filter
      if (timeRange !== 'ALL' && timeRange !== 'CUSTOM') {
        let filterDate = new Date(0);
        if (timeRange === '7D') filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (timeRange === '30D') filterDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30);
        else if (timeRange === '1Y') filterDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        if (d < filterDate) return false;
      }

      // Custom Selectors Filter
      if (timeRange === 'CUSTOM') {
        const monthMatch = selectedMonth === 'ALL' || d.toLocaleString('default', { month: 'long' }) === selectedMonth;
        const yearMatch = selectedYear === 'ALL' || d.getFullYear().toString() === selectedYear;
        if (!monthMatch || !yearMatch) return false;
      }

      return true;
    });

    const spent = Math.abs(filteredTransactions.reduce((acc: number, t: any) => {
      // Use manualType if present, otherwise fallback to amount sign
      const finalType = t.manualType || (t.amount < 0 ? 'Debit' : 'Credit');
      return finalType === 'Debit' ? acc + t.amount : acc;
    }, 0));

    const earned = filteredTransactions.reduce((acc: number, t: any) => {
      const finalType = t.manualType || (t.amount < 0 ? 'Debit' : 'Credit');
      return finalType === 'Credit' ? acc + Math.abs(t.amount) : acc;
    }, 0);

    // Product split for chart based on filtered transactions
    const productSplit = filteredTransactions.reduce((acc: any, t: any) => {
      const finalType = t.manualType || (t.amount < 0 ? 'Debit' : 'Credit');
      if (finalType === 'Debit') {
        const val = Math.abs(t.amount || 0);
        acc[t.product] = (acc[t.product] || 0) + val;
      }
      return acc;
    }, {});
    const chartData = Object.entries(productSplit).map(([name, value]) => ({ name, value }));

    return {
      transactions: filteredTransactions,
      summary: {
        spent,
        earned,
        count: filteredTransactions.length
      },
      chartData
    };
  };

  const toggleTransactionType = (txId: string) => {
    const updatedTransactions = data.transactions.map((t: any) => {
      if (t.transactionId === txId) {
        const currentType = t.manualType || (t.amount < 0 ? 'Debit' : 'Credit');
        return { ...t, manualType: currentType === 'Debit' ? 'Credit' : 'Debit' };
      }
      return t;
    });
    setData({ ...data, transactions: updatedTransactions });
  };

  const toggleTransactionStatus = (txId: string) => {
    const updatedTransactions = data.transactions.map((t: any) => {
      if (t.transactionId === txId) {
        // Toggle between explicitly Failed or use natural detection if Completed
        const currentIsFailed = t.manualStatus === 'Failed' || /failed|cancelled|declined|rejected/i.test(t.description || '');
        return { ...t, manualStatus: currentIsFailed ? 'Completed' : 'Failed' };
      }
      return t;
    });
    setData({ ...data, transactions: updatedTransactions });
  };

  const [isSaving, setIsSaving] = useState(false);
  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: data.transactions }),
      });
      if (res.ok) alert('Changes saved successfully!');
      else throw new Error('Failed to save');
    } catch (err) {
      alert('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const dashboardData = getFilteredData();

  // Get available months and years for dropdowns
  const availableYears = Array.from(new Set(data?.transactions.map((t: any) => {
    const d = new Date(t.time);
    return isNaN(d.getTime()) ? null : d.getFullYear().toString();
  }).filter(Boolean))) as string[];

  const sortedYears = availableYears.sort().reverse();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Pagination logic
  const totalItems = dashboardData?.transactions.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = dashboardData?.transactions.slice(startIndex, startIndex + itemsPerPage) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <span className="font-bold tracking-widest uppercase text-xs text-blue-400/60">Analyzing financial data...</span>
      </div>
    );
  }

  if (!data || data.transactions.length === 0) {
    return (
      <main className="min-h-screen bg-[#020617] text-white p-8 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#3b82f615,transparent_50%)]" />

        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-20 relative z-10 text-center">
          <div className="mb-12 space-y-6">
            <div className="w-24 h-24 bg-blue-600/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-blue-500/20">
              <Wallet className="w-12 h-12 text-blue-400" />
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-tight gradient-text">
              Wealth Insight
            </h1>
            <p className="text-slate-400 text-xl font-medium max-w-2xl mx-auto leading-relaxed px-4">
              Unlock deep insights from your Google Pay activity. Visualize spending, track rewards, and understand your financial habits with precision.
            </p>
          </div>
          <ImportZone onImportComplete={fetchData} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 md:p-8 relative overflow-hidden">
      {/* Background accents */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-blue-600/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-emerald-600/5 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-full mx-auto relative z-10 px-2 lg:px-8">
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-16">
          <div className="space-y-3">
            <h1 className="text-6xl font-black tracking-tighter gradient-text leading-none">
              Financial Narrative
            </h1>
            <div className="flex items-center gap-4 text-slate-500 font-medium text-sm">
              <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] uppercase tracking-widest font-black text-blue-400">Analysis Mode</span>
              <p>Tracking {data.transactions.length} activities</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Specific Selectors */}
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 glass">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setTimeRange('CUSTOM');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-black text-slate-300 border-none focus:ring-0 cursor-pointer px-3 outline-none"
              >
                <option value="ALL">All Months</option>
                {months.map(m => <option key={m} value={m} className="bg-[#020617]">{m}</option>)}
              </select>
              <div className="w-px h-4 bg-white/10" />
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setTimeRange('CUSTOM');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-black text-slate-300 border-none focus:ring-0 cursor-pointer px-3 outline-none"
              >
                <option value="ALL">All Years</option>
                {sortedYears.map(y => <option key={y} value={y} className="bg-[#020617]">{y}</option>)}
              </select>
            </div>

            {/* Quick Ranges */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 glass">
              {(['7D', '30D', '1Y', 'ALL'] as const).map((rng) => (
                <button
                  key={rng}
                  onClick={() => {
                    setTimeRange(rng);
                    setSelectedMonth('ALL');
                    setSelectedYear('ALL');
                    setCurrentPage(1);
                  }}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${timeRange === rng
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {rng === '7D' ? 'WEEK' : rng === '30D' ? 'MONTH' : rng === '1Y' ? 'YEAR' : 'LIFETIME'}
                </button>
              ))}
            </div>

            <button
              onClick={saveChanges}
              disabled={isSaving}
              className="flex items-center gap-3 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all text-xs font-black text-white uppercase tracking-widest group"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
              Save My Fixes
            </button>

            <button
              onClick={() => {
                setData(null);
                setTimeRange('ALL');
                setSelectedMonth('ALL');
                setSelectedYear('ALL');
                setCurrentPage(1);
              }}
              className="flex items-center gap-3 px-6 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all text-xs font-black text-slate-400 uppercase tracking-widest group"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
              Reset All
            </button>
          </div>
        </header>

        {/* Dynamic Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 px-4">
          <StatsCard
            title="Total Spent"
            value={`₹${dashboardData?.summary.spent.toLocaleString()}`}
            icon={IndianRupee}
            trend={timeRange === 'CUSTOM' ? `${selectedMonth} ${selectedYear}` : timeRange === 'ALL' ? 'Lifetime' : `Last ${timeRange}`}
            className="border-blue-500/20 bg-blue-500/5"
          />
          <StatsCard
            title="Total Earned"
            value={`₹${dashboardData?.summary.earned.toLocaleString()}`}
            icon={TrendingUp}
            trend="Income & Credits"
            className="border-emerald-500/20 bg-emerald-500/5"
          />
          <StatsCard
            title="Cashback Rewards"
            value={`₹${data.summary.totalCashback.toLocaleString()}`}
            icon={Gift}
            description={`${data.cashback.length} Rewards collected`}
          />
          <StatsCard
            title="Calculated Margin"
            value={`₹${((dashboardData?.summary.earned || 0) - (dashboardData?.summary.spent || 0)).toLocaleString()}`}
            icon={Wallet}
            description="Net Balance (Filtered)"
          />
        </div>

        {/* High-impact Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-2 glass rounded-[3.5rem] p-12 border border-white/5 relative overflow-hidden group shadow-2xl">
            <h3 className="text-3xl font-black mb-12 text-slate-100 flex items-center tracking-tight">
              <PieChartIcon className="w-8 h-8 mr-5 text-blue-400" />
              Service Density
            </h3>
            <div className="h-[450px]">
              <SpendingPieChart data={dashboardData?.chartData || []} />
            </div>
          </div>

          <div className="lg:col-span-3 glass rounded-[3.5rem] p-12 border border-white/5 relative overflow-hidden group shadow-2xl">
            <h3 className="text-3xl font-black mb-12 text-slate-100 flex items-center tracking-tight">
              <TrendingUp className="w-8 h-8 mr-5 text-emerald-400" />
              Spending Velocity
            </h3>
            <div className="h-[450px]">
              <MonthlyTrendChart transactions={dashboardData?.transactions || []} />
            </div>
          </div>
        </div>

        {/* Full-width Activity Stream */}
        <div id="ledger-head" className="glass rounded-[4rem] border border-white/5 overflow-hidden mb-32 shadow-2xl">
          <div className="p-12 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div className="space-y-1">
              <h3 className="text-4xl font-black text-slate-100 tracking-tight">Activity Ledger</h3>
              <p className="text-slate-500 text-base font-medium">Real-time breakdown of your extracted GPay narrative</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                >
                  Prev
                </button>
                <span className="text-[10px] font-black text-blue-400 px-2">{currentPage} / {totalPages || 1}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-white disabled:opacity-20 transition-all"
                >
                  Next
                </button>
              </div>
              <div className="px-6 py-3 bg-blue-500/10 rounded-2xl border border-blue-500/10 text-xs font-black text-blue-400 uppercase tracking-widest">
                {totalItems} Filtered entries
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/2 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                  <th className="px-6 py-10 text-center w-20">#</th>
                  <th className="px-10 py-10">Occasion</th>
                  <th className="px-10 py-10">Activity Details</th>
                  <th className="px-10 py-10">Product</th>
                  <th className="px-10 py-10 text-center">Type Control</th>
                  <th className="px-10 py-10 text-center">Status</th>
                  <th className="px-12 py-10 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/2">
                {paginatedTransactions.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-blue-500/[0.03] transition-all duration-300 group">
                    <td className="px-6 py-10 text-center">
                      <span className="text-slate-600 text-xs font-black">{startIndex + i + 1}</span>
                    </td>
                    <td className="px-10 py-10">
                      <span className="text-slate-400 text-sm font-black tracking-tight">{t.time.split(',')[0]}</span>
                    </td>
                    <td className="px-10 py-10">
                      <div className="flex flex-col">
                        <span className="text-slate-100 font-extrabold tracking-tight text-xl mb-1 group-hover:text-blue-400 transition-colors">{t.description}</span>
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Descriptor: {t.transactionId}</span>
                      </div>
                    </td>
                    <td className="px-10 py-10">
                      <span className="px-4 py-2 bg-slate-800/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 border border-white/5 group-hover:border-blue-500/20 transition-colors">
                        {t.product || 'Google'}
                      </span>
                    </td>
                    <td className="px-10 py-10 text-center">
                      <button
                        onClick={() => toggleTransactionType(t.transactionId)}
                        className={`flex justify-center items-center gap-3 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all hover:scale-105 active:scale-95 w-32 ${(t.manualType || (t.amount < 0 ? 'Debit' : 'Credit')) === 'Debit'
                          ? 'text-blue-400 border-blue-400/20 bg-blue-400/5'
                          : 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5'
                          }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${(t.manualType || (t.amount < 0 ? 'Debit' : 'Credit')) === 'Debit' ? 'bg-blue-400' : 'bg-emerald-400'
                          }`} />
                        {t.manualType || (t.amount < 0 ? 'Debit' : 'Credit')}
                      </button>
                    </td>
                    <td className="px-10 py-10 text-center">
                      <button
                        onClick={() => toggleTransactionStatus(t.transactionId)}
                        className={`flex justify-center items-center gap-3 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all hover:scale-105 active:scale-95 w-32 ${(t.manualStatus === 'Failed' || /failed|cancelled|declined|rejected/i.test(t.description || ''))
                            ? 'text-rose-400 border-rose-400/20 bg-rose-400/5'
                            : 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5'
                          }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${(t.manualStatus === 'Failed' || /failed|cancelled|declined|rejected/i.test(t.description || '')) ? 'bg-rose-400' : 'bg-emerald-400'
                          }`} />
                        {(t.manualStatus === 'Failed' || /failed|cancelled|declined|rejected/i.test(t.description || '')) ? 'Failed' : 'Success'}
                      </button>
                    </td>
                    <td className={`px-12 py-10 text-right font-black text-3xl tracking-tighter ${(t.manualType || (t.amount < 0 ? 'Debit' : 'Credit')) === 'Debit' ? 'text-slate-200' : 'text-emerald-400'
                      }`}>
                      {(t.manualType || (t.amount < 0 ? 'Debit' : 'Credit')) === 'Debit' ? '-' : '+'}₹{Math.abs(t.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination */}
          <div className="p-12 border-t border-white/5 flex items-center justify-center bg-white/[0.01]">
            <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: document.getElementById('ledger-head')?.offsetTop || 1000, behavior: 'smooth' });
                }}
                className="px-8 py-3 text-xs font-black uppercase text-slate-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
              >
                Previous Page
              </button>
              <div className="w-px h-6 bg-white/10" />
              <span className="text-xs font-black text-blue-400 px-6 tracking-widest">PAGE {currentPage} OF {totalPages || 1}</span>
              <div className="w-px h-6 bg-white/10" />
              <button
                disabled={currentPage >= totalPages}
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  window.scrollTo({ top: 1000, behavior: 'smooth' });
                }}
                className="px-8 py-3 text-xs font-black uppercase text-slate-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
              >
                Next Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
