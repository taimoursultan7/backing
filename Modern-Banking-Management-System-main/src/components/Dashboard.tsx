// ============================================================
// Dashboard — Premium Professional Design
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { getAccounts, getTransactions } from '../utils/storage';
import { formatCurrency, formatDateTime, getMonthlyStats } from '../utils/helpers';
import { Account, Transaction } from '../types';

declare const Chart: any;

interface DashboardProps {
  onNavigate: (section: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const lineChartRef  = useRef<HTMLCanvasElement>(null);
  const doughnutRef   = useRef<HTMLCanvasElement>(null);
  const barChartRef   = useRef<HTMLCanvasElement>(null);
  const lineInstance  = useRef<any>(null);
  const doughnutInst  = useRef<any>(null);
  const barInstance   = useRef<any>(null);

  useEffect(() => {
    setAccounts(getAccounts());
    setTransactions(getTransactions());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalBalance     = accounts.reduce((s, a) => s + a.balance, 0);
  const totalDeposits    = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
  const totalTransfers   = transactions.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);
  const activeAccounts   = accounts.filter(a => a.status === 'active').length;
  const frozenAccounts   = accounts.filter(a => a.status === 'frozen').length;
  const depositCount     = transactions.filter(t => t.type === 'deposit').length;
  const withdrawCount    = transactions.filter(t => t.type === 'withdraw').length;

  // ── Charts ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof Chart === 'undefined') return;
    if (!lineChartRef.current || !doughnutRef.current || !barChartRef.current) return;

    const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const monthly   = getMonthlyStats();
    const labels    = monthly.map(m => m.label);

    lineInstance.current?.destroy();
    doughnutInst.current?.destroy();
    barInstance.current?.destroy();

    // Gradient helper
    const grad = (ctx: CanvasRenderingContext2D, top: string, bottom: string) => {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, top); g.addColorStop(1, bottom); return g;
    };

    // ── Area Line Chart
    const lCtx = lineChartRef.current.getContext('2d')!;
    lineInstance.current = new Chart(lineChartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Deposits',
            data: monthly.map(m => m.deposits),
            borderColor: '#10b981',
            backgroundColor: grad(lCtx, 'rgba(16,185,129,0.18)', 'rgba(16,185,129,0.01)'),
            tension: 0.45, fill: true, pointRadius: 5, pointHoverRadius: 7,
            pointBackgroundColor: '#fff', pointBorderColor: '#10b981', pointBorderWidth: 2,
            borderWidth: 2.5,
          },
          {
            label: 'Withdrawals',
            data: monthly.map(m => m.withdrawals),
            borderColor: '#ef4444',
            backgroundColor: grad(lCtx, 'rgba(239,68,68,0.12)', 'rgba(239,68,68,0.01)'),
            tension: 0.45, fill: true, pointRadius: 5, pointHoverRadius: 7,
            pointBackgroundColor: '#fff', pointBorderColor: '#ef4444', pointBorderWidth: 2,
            borderWidth: 2.5,
          },
          {
            label: 'Transfers',
            data: monthly.map(m => m.transfers),
            borderColor: '#6366f1',
            backgroundColor: grad(lCtx, 'rgba(99,102,241,0.12)', 'rgba(99,102,241,0.01)'),
            tension: 0.45, fill: true, pointRadius: 5, pointHoverRadius: 7,
            pointBackgroundColor: '#fff', pointBorderColor: '#6366f1', pointBorderWidth: 2,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: textColor, usePointStyle: true, pointStyleWidth: 8, padding: 18, font: { size: 12, weight: '600' } } },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: textColor,
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` },
          },
        },
        scales: {
          x: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 11 } } },
          y: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 11 }, callback: (v: number) => `₨${(v / 1000).toFixed(0)}K` } },
        },
      },
    });

    // ── Doughnut
    const savingCount   = accounts.filter(a => a.accountType === 'saving').length;
    const currentCount  = accounts.filter(a => a.accountType === 'current').length;
    const businessCount = accounts.filter(a => a.accountType === 'business').length;

    doughnutInst.current = new Chart(doughnutRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Saving', 'Current', 'Business'],
        datasets: [{
          data: [savingCount, currentCount, businessCount],
          backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6'],
          borderColor: isDark ? '#111827' : '#ffffff',
          borderWidth: 4, hoverOffset: 10,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '74%',
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, usePointStyle: true, pointStyleWidth: 8, padding: 14, font: { size: 11, weight: '600' } } },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: textColor, borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1, padding: 10, cornerRadius: 8,
          },
        },
      },
    });

    // ── Grouped Bar
    barInstance.current = new Chart(barChartRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Deposits',
            data: monthly.map(m => m.deposits),
            backgroundColor: 'rgba(16,185,129,0.85)',
            borderRadius: { topLeft: 6, topRight: 6 }, borderSkipped: false,
          },
          {
            label: 'Withdrawals',
            data: monthly.map(m => m.withdrawals),
            backgroundColor: 'rgba(239,68,68,0.8)',
            borderRadius: { topLeft: 6, topRight: 6 }, borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: textColor, usePointStyle: true, pointStyleWidth: 8, font: { size: 12, weight: '600' } } },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: textColor, borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
          y: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 11 }, callback: (v: number) => `₨${(v / 1000).toFixed(0)}K` } },
        },
      },
    });

    return () => {
      lineInstance.current?.destroy();
      doughnutInst.current?.destroy();
      barInstance.current?.destroy();
    };
  }, [accounts, transactions]);

  const recentTxns = [...transactions].reverse().slice(0, 8);

  const stats = [
    {
      label: 'Total Accounts', value: accounts.length.toString(), icon: 'bi-people-fill', color: 'blue',
      sub: `${activeAccounts} active · ${frozenAccounts} frozen`, up: true,
    },
    {
      label: 'Total Balance', value: formatCurrency(totalBalance), icon: 'bi-wallet2', color: 'green',
      sub: 'Across all accounts', up: true,
    },
    {
      label: 'Total Deposits', value: formatCurrency(totalDeposits), icon: 'bi-arrow-down-circle-fill', color: 'purple',
      sub: `${depositCount} transaction${depositCount !== 1 ? 's' : ''}`, up: true,
    },
    {
      label: 'Total Withdrawals', value: formatCurrency(totalWithdrawals), icon: 'bi-arrow-up-circle-fill', color: 'red',
      sub: `${withdrawCount} transaction${withdrawCount !== 1 ? 's' : ''}`, up: false,
    },
  ];

  const quickActions = [
    { icon: 'bi-person-plus-fill',       label: 'New Account',         desc: 'Create a customer account', section: 'accounts',  color: '#1a56db' },
    { icon: 'bi-arrow-down-circle-fill', label: 'Deposit Money',       desc: 'Add funds to account',      section: 'deposit',   color: '#10b981' },
    { icon: 'bi-arrow-up-circle-fill',   label: 'Withdraw Money',      desc: 'Withdraw from account',     section: 'withdraw',  color: '#ef4444' },
    { icon: 'bi-arrow-left-right',       label: 'Transfer Funds',      desc: 'Move between accounts',     section: 'transfer',  color: '#8b5cf6' },
    { icon: 'bi-clock-history',          label: 'Transaction History',  desc: 'Full ledger view',          section: 'history',   color: '#f59e0b' },
    { icon: 'bi-graph-up-arrow',         label: 'Analytics',           desc: 'Charts & insights',         section: 'analytics', color: '#0ea5e9' },
  ];

  const txnColor = (type: string) => type === 'deposit' ? '#10b981' : type === 'withdraw' ? '#ef4444' : '#6366f1';
  const txnIcon  = (type: string) => type === 'deposit' ? 'bi-arrow-down-circle-fill' : type === 'withdraw' ? 'bi-arrow-up-circle-fill' : 'bi-arrow-left-right';

  return (
    <div>
      {/* ── Welcome Banner ─────────────────────────────────────── */}
      <div className="dashboard-welcome" style={{ marginBottom: '1.75rem' }}>
        <div className="welcome-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '6px', padding: '0.2rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Live Dashboard
            </span>
          </div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '0.3rem' }}>
            Welcome to NexaBank
          </h2>
          <p style={{ opacity: 0.75, fontSize: '0.9rem' }}>
            Monitor accounts, track transactions and analyse performance in real-time.
          </p>
          <div className="welcome-stats" style={{ marginTop: '1.5rem' }}>
            {[
              { val: accounts.length,       label: 'Accounts'     },
              { val: transactions.length,    label: 'Transactions' },
              { val: activeAccounts,         label: 'Active'       },
              { val: accounts.length - activeAccounts, label: 'Inactive' },
            ].map((s, i) => (
              <div key={i} className="welcome-stat">
                <div className="welcome-stat-val">{s.val}</div>
                <div className="welcome-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="welcome-time">
          <div className="time">{currentTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div className="date">{currentTime.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* ── KPI Stat Cards ─────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        {stats.map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-card-header">
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value animated-number">{s.value}</div>
              </div>
              <div className={`stat-icon ${s.color}`}>
                <i className={`bi ${s.icon}`}></i>
              </div>
            </div>
            <div className={`stat-change ${s.up ? 'up' : 'down'}`}>
              <i className={`bi ${s.up ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`}></i>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Net Flow KPI Row ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Net Cash Flow', value: formatCurrency(totalDeposits - totalWithdrawals), icon: 'bi-currency-dollar', color: totalDeposits >= totalWithdrawals ? '#10b981' : '#ef4444', bg: totalDeposits >= totalWithdrawals ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' },
          { label: 'Total Transfers', value: formatCurrency(totalTransfers), icon: 'bi-arrow-left-right', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'Avg Account Balance', value: accounts.length > 0 ? formatCurrency(totalBalance / accounts.length) : '₨0', icon: 'bi-calculator-fill', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        ].map((item, i) => (
          <div key={i} className="card" style={{ border: `1px solid ${item.color}22` }}>
            <div style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: '1.25rem', flexShrink: 0 }}>
                <i className={`bi ${item.icon}`}></i>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{item.label}</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: item.color }}>{item.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Line Chart + Doughnut ───────────────────────────────── */}
      <div className="charts-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="bi bi-graph-up-arrow"></i> Transaction Trends — Last 6 Months</div>
            <span className="badge badge-success" style={{ gap: '0.3rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
              Live
            </span>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 290 }}>
              <canvas ref={lineChartRef}></canvas>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="bi bi-pie-chart-fill"></i> Account Type Split</div>
          </div>
          <div className="card-body">
            {/* Centre label */}
            <div style={{ position: 'relative' }}>
              <div className="chart-container" style={{ height: 240 }}>
                <canvas ref={doughnutRef}></canvas>
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-58%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{accounts.length}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total</div>
              </div>
            </div>
            {/* Legend pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Saving',   count: accounts.filter(a => a.accountType === 'saving').length,   color: '#3b82f6' },
                { label: 'Current',  count: accounts.filter(a => a.accountType === 'current').length,  color: '#10b981' },
                { label: 'Business', count: accounts.filter(a => a.accountType === 'business').length, color: '#8b5cf6' },
              ].map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }}></span>
                  {p.label} <strong style={{ color: 'var(--text-primary)' }}>({p.count})</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bar Chart + Quick Actions ───────────────────────────── */}
      <div className="charts-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="bi bi-bar-chart-fill"></i> Monthly Volume Comparison</div>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 270 }}>
              <canvas ref={barChartRef}></canvas>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="bi bi-lightning-charge-fill"></i> Quick Actions</div>
          </div>
          <div className="card-body" style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(qa.section)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    padding: '0.85rem', borderRadius: '12px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg-input)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    fontFamily: 'inherit', textAlign: 'left', gap: '0.4rem',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = qa.color;
                    (e.currentTarget as HTMLElement).style.background = `${qa.color}12`;
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${qa.color}25`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-input)';
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${qa.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qa.color, fontSize: '1rem' }}>
                    <i className={`bi ${qa.icon}`}></i>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{qa.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{qa.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ─────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="bi bi-clock-history"></i> Recent Transactions</div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('history')}>
            View All <i className="bi bi-arrow-right"></i>
          </button>
        </div>
        {recentTxns.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-inbox"></i>
            <h3>No Transactions Yet</h3>
            <p>Transactions will appear here once made.</p>
          </div>
        ) : (
          <div style={{ padding: '0.5rem 0' }}>
            {recentTxns.map((txn, i) => (
              <div
                key={txn.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.85rem 1.5rem',
                  borderBottom: i < recentTxns.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-table-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: `${txnColor(txn.type)}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: txnColor(txn.type), fontSize: '1rem',
                }}>
                  <i className={`bi ${txnIcon(txn.type)}`}></i>
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{txn.type}</span>
                    <span className={`badge badge-${txn.status === 'success' ? 'success' : 'danger'}`} style={{ fontSize: '0.62rem' }}>{txn.status}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem', display: 'flex', gap: '0.5rem' }}>
                    <span className="font-mono">{txn.accountNumber}</span>
                    <span>·</span>
                    <span>{txn.description || '—'}</span>
                  </div>
                </div>
                {/* Amount + Date */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: txnColor(txn.type) }}>
                    {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {formatDateTime(txn.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
