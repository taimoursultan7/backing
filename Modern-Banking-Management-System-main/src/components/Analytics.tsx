// ============================================================
// Analytics & Reports Dashboard — Professional Financial Intelligence
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { getAccounts, getTransactions } from '../utils/storage';
import { formatCurrency, getMonthlyStats } from '../utils/helpers';

declare const Chart: any;

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'all' | '6m' | 'month'>('all');
  const accounts = getAccounts();
  const transactions = getTransactions();
  const monthly = getMonthlyStats();

  const lineRef = useRef<HTMLCanvasElement>(null);
  const pieRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);
  const volumeBarRef = useRef<HTMLCanvasElement>(null);

  // Totals
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
  const totalTransfers = transactions.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);

  const depositCount = transactions.filter(t => t.type === 'deposit').length;
  const withdrawCount = transactions.filter(t => t.type === 'withdraw').length;
  const transferCount = transactions.filter(t => t.type === 'transfer').length;

  const savingBal = accounts.filter(a => a.accountType === 'saving').reduce((s, a) => s + a.balance, 0);
  const currentBal = accounts.filter(a => a.accountType === 'current').reduce((s, a) => s + a.balance, 0);
  const businessBal = accounts.filter(a => a.accountType === 'business').reduce((s, a) => s + a.balance, 0);

  // Metrics
  const netInflow = totalDeposits - (totalWithdrawals + totalTransfers);
  const retentionRate = totalDeposits > 0 ? Math.max(0, ((totalDeposits - totalWithdrawals) / totalDeposits) * 100).toFixed(1) : '100.0';
  const avgTxnSize = transactions.length > 0 ? (totalDeposits + totalWithdrawals + totalTransfers) / transactions.length : 0;

  useEffect(() => {
    if (typeof Chart === 'undefined') return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const charts: any[] = [];

    const grad = (ctx: CanvasRenderingContext2D, top: string, bottom: string) => {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, top); g.addColorStop(1, bottom); return g;
    };

    // 1. Monthly Trends Line
    if (lineRef.current) {
      const lCtx = lineRef.current.getContext('2d')!;
      charts.push(new Chart(lineRef.current, {
        type: 'line',
        data: {
          labels: monthly.map(m => m.label),
          datasets: [
            {
              label: 'Deposits', data: monthly.map(m => m.deposits),
              borderColor: '#10b981', backgroundColor: grad(lCtx, 'rgba(16,185,129,0.18)', 'rgba(16,185,129,0.01)'),
              tension: 0.45, fill: true, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#10b981',
            },
            {
              label: 'Withdrawals', data: monthly.map(m => m.withdrawals),
              borderColor: '#ef4444', backgroundColor: grad(lCtx, 'rgba(239,68,68,0.12)', 'rgba(239,68,68,0.01)'),
              tension: 0.45, fill: true, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#ef4444',
            },
            {
              label: 'Transfers', data: monthly.map(m => m.transfers),
              borderColor: '#3b82f6', backgroundColor: grad(lCtx, 'rgba(59,130,246,0.12)', 'rgba(59,130,246,0.01)'),
              tension: 0.45, fill: true, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#3b82f6',
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: textColor, usePointStyle: true, font: { size: 12, weight: '600' } } },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#fff',
              titleColor: isDark ? '#f1f5f9' : '#0f172a',
              bodyColor: textColor, borderColor: isDark ? '#334155' : '#e2e8f0',
              borderWidth: 1, padding: 12, cornerRadius: 10,
              callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` },
            },
          },
          scales: {
            x: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 11 } } },
            y: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 11 }, callback: (v: number) => `₨${(v/1000).toFixed(0)}K` } },
          },
        },
      }));
    }

    // 2. Account Type Doughnut
    if (pieRef.current) {
      charts.push(new Chart(pieRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Saving Accounts', 'Current Accounts', 'Business Accounts'],
          datasets: [{
            data: [
              accounts.filter(a => a.accountType === 'saving').length,
              accounts.filter(a => a.accountType === 'current').length,
              accounts.filter(a => a.accountType === 'business').length,
            ],
            backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6'],
            borderWidth: 4, borderColor: isDark ? '#111827' : '#fff', hoverOffset: 8,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '72%',
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor, usePointStyle: true, padding: 14, font: { size: 11, weight: '600' } } },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#fff',
              titleColor: isDark ? '#f1f5f9' : '#0f172a',
              bodyColor: textColor, borderColor: isDark ? '#334155' : '#e2e8f0',
              borderWidth: 1, padding: 10, cornerRadius: 8,
            },
          },
        },
      }));
    }

    // 3. Balance Bar Chart
    if (barRef.current) {
      charts.push(new Chart(barRef.current, {
        type: 'bar',
        data: {
          labels: ['Saving', 'Current', 'Business'],
          datasets: [{
            label: 'Total Balance (PKR)',
            data: [savingBal, currentBal, businessBal],
            backgroundColor: ['rgba(59,130,246,0.85)', 'rgba(16,185,129,0.85)', 'rgba(139,92,246,0.85)'],
            borderRadius: { topLeft: 8, topRight: 8 }, borderSkipped: false,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: textColor, font: { size: 12, weight: '600' } } },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#fff',
              titleColor: isDark ? '#f1f5f9' : '#0f172a',
              bodyColor: textColor, borderColor: isDark ? '#334155' : '#e2e8f0',
              borderWidth: 1, padding: 12, cornerRadius: 10,
              callbacks: { label: (ctx: any) => ` Balance: ${formatCurrency(ctx.parsed.y)}` },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
            y: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 11 }, callback: (v: number) => `₨${(v/1000).toFixed(0)}K` } },
          },
        },
      }));
    }

    // 4. Clean Transaction Volume & Count Breakdown (Horizontal Bar Chart)
    if (volumeBarRef.current) {
      charts.push(new Chart(volumeBarRef.current, {
        type: 'bar',
        data: {
          labels: ['Deposits', 'Withdrawals', 'Transfers'],
          datasets: [
            {
              label: 'Amount (PKR)',
              data: [totalDeposits, totalWithdrawals, totalTransfers],
              backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.85)', 'rgba(59,130,246,0.85)'],
              borderRadius: { topRight: 8, bottomRight: 8 },
              barThickness: 22,
            }
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#fff',
              titleColor: isDark ? '#f1f5f9' : '#0f172a',
              bodyColor: textColor, borderColor: isDark ? '#334155' : '#e2e8f0',
              borderWidth: 1, padding: 12, cornerRadius: 10,
              callbacks: { label: (ctx: any) => ` Volume: ${formatCurrency(ctx.parsed.x)}` },
            },
          },
          scales: {
            x: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 11 }, callback: (v: number) => `₨${(v/1000).toFixed(0)}K` } },
            y: { grid: { display: false }, ticks: { color: textColor, font: { size: 11, weight: '600' } } },
          },
        },
      }));
    }

    return () => charts.forEach(c => c.destroy());
  }, [accounts, transactions, timeRange]);

  const stats = [
    { label: 'Total Revenue (Deposits)', value: formatCurrency(totalDeposits), icon: 'bi-graph-up-arrow', color: '#10b981', badge: `${depositCount} txns` },
    { label: 'Total Outflow (Withdrawals)', value: formatCurrency(totalWithdrawals), icon: 'bi-arrow-up-circle-fill', color: '#ef4444', badge: `${withdrawCount} txns` },
    { label: 'Total Transfers', value: formatCurrency(totalTransfers), icon: 'bi-arrow-left-right', color: '#3b82f6', badge: `${transferCount} txns` },
    { label: 'Net Capital Reserve', value: formatCurrency(netInflow), icon: 'bi-wallet2', color: netInflow >= 0 ? '#10b981' : '#ef4444', badge: `${retentionRate}% retained` },
    { label: 'Active Customers', value: accounts.filter(a => a.status === 'active').length.toString(), icon: 'bi-people-fill', color: '#8b5cf6', badge: `of ${accounts.length} total` },
    { label: 'Average Txn Size', value: formatCurrency(avgTxnSize), icon: 'bi-calculator-fill', color: '#f59e0b', badge: `${transactions.length} total txns` },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>Analytics & Reports</h1>
          <p>Comprehensive financial intelligence & institutional insights</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', display: 'flex', gap: '2px' }}>
            {[
              { id: 'all', label: 'All Time' },
              { id: '6m', label: '6 Months' },
              { id: 'month', label: '30 Days' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id as any)}
                style={{
                  padding: '0.45rem 0.9rem', borderRadius: '8px', border: 'none',
                  background: timeRange === tab.id ? 'var(--primary)' : 'transparent',
                  color: timeRange === tab.id ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <i className="bi bi-printer-fill"></i> Print Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={{ border: `1px solid ${s.color}25` }}>
            <div className="card-body" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: '1.3rem', flexShrink: 0 }}>
                  <i className={`bi ${s.icon}`}></i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{s.label}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.72rem', color: s.color, fontWeight: 600, marginTop: '0.2rem' }}>{s.badge}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="bi bi-graph-up-arrow"></i> Monthly Financial Growth</div>
            <span className="badge badge-success">6 Month Overview</span>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 290 }}>
              <canvas ref={lineRef}></canvas>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="bi bi-pie-chart-fill"></i> Account Type Distribution</div>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 290 }}>
              <canvas ref={pieRef}></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="bi bi-bar-chart-fill"></i> Total Liquidity by Account Type</div>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 270 }}>
              <canvas ref={barRef}></canvas>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="bi bi-bar-chart-steps"></i> Transaction Volume by Type (PKR)</div>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 270 }}>
              <canvas ref={volumeBarRef}></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* Account Summary Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="bi bi-table"></i> Institutional Portfolio Summary</div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Account Type</th>
                <th>Total Accounts</th>
                <th>Active Accounts</th>
                <th>Inactive / Frozen</th>
                <th>Total Reserve</th>
                <th>Average Balance</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {['saving', 'current', 'business'].map(type => {
                const typeAccs = accounts.filter(a => a.accountType === type);
                const active = typeAccs.filter(a => a.status === 'active').length;
                const total = typeAccs.reduce((s, a) => s + a.balance, 0);
                const share = totalBalance > 0 ? ((total / totalBalance) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={type}>
                    <td><span className={`badge badge-${type === 'saving' ? 'primary' : type === 'current' ? 'success' : 'purple'}`} style={{ textTransform: 'capitalize' }}>{type}</span></td>
                    <td style={{ fontWeight: 600 }}>{typeAccs.length}</td>
                    <td><span style={{ color: 'var(--success)', fontWeight: 700 }}>{active}</span></td>
                    <td><span style={{ color: 'var(--danger)', fontWeight: 700 }}>{typeAccs.length - active}</span></td>
                    <td style={{ fontWeight: 800 }}>{formatCurrency(total)}</td>
                    <td>{typeAccs.length > 0 ? formatCurrency(total / typeAccs.length) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-input)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${share}%`, background: type === 'saving' ? '#3b82f6' : type === 'current' ? '#10b981' : '#8b5cf6' }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', minWidth: 35 }}>{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
