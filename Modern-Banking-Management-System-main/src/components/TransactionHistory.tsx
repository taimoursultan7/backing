// ============================================================
// Transaction History — Full History with Filter, Search, PDF
// ============================================================

import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { getTransactions } from '../utils/storage';
import { formatCurrency, formatDateTime, exportTransactionsCSV } from '../utils/helpers';
import { ToastData } from './Toast';

interface TransactionHistoryProps {
  showToast: (t: Omit<ToastData, 'id'>) => void;
}

const ITEMS_PER_PAGE = 12;

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ showToast }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [viewTxn, setViewTxn] = useState<Transaction | null>(null);

  useEffect(() => { setTransactions(getTransactions()); }, []);

  // Filter
  let filtered = transactions.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.transactionId.toLowerCase().includes(q) || t.accountNumber.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.toAccount || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || t.type === typeFilter;
    const txDate = new Date(t.createdAt);
    const matchFrom = !dateFrom || txDate >= new Date(dateFrom);
    const matchTo = !dateTo || txDate <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchType && matchFrom && matchTo;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const totalDeposits = filtered.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = filtered.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
  const totalTransfers = filtered.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);

  const clearFilters = () => { setSearch(''); setTypeFilter('all'); setDateFrom(''); setDateTo(''); setPage(1); };

  const printStatement = () => {
    const content = `
      <html><head><title>NexaBank — Transaction Statement</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1a56db; } table { width: 100%; border-collapse: collapse; }
        th { background: #1a56db; color: white; padding: 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
        tr:nth-child(even) { background: #f8f9fa; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
      </style></head><body>
      <div class="header">
        <div><h1>🏦 NexaBank</h1><p>Transaction Statement</p></div>
        <div style="text-align:right"><p>Generated: ${new Date().toLocaleString()}</p><p>Total Records: ${filtered.length}</p></div>
      </div>
      <table><thead><tr><th>Transaction ID</th><th>Type</th><th>Amount</th><th>Account</th><th>Description</th><th>Date & Time</th><th>Status</th></tr></thead>
      <tbody>${filtered.map(t => `<tr><td>${t.transactionId}</td><td>${t.type.toUpperCase()}</td><td>PKR ${t.amount.toFixed(2)}</td><td>${t.accountNumber}</td><td>${t.description}</td><td>${formatDateTime(t.createdAt)}</td><td>${t.status.toUpperCase()}</td></tr>`).join('')}
      </tbody></table></body></html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(content); win.document.close(); win.print(); }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Transaction History</h1>
          <p>Complete history of all banking transactions</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={printStatement}><i className="bi bi-printer-fill"></i> Print</button>
          <button className="btn btn-outline btn-sm" onClick={() => exportTransactionsCSV(filtered)}><i className="bi bi-download"></i> CSV</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Deposits', amount: totalDeposits, count: filtered.filter(t => t.type === 'deposit').length, color: '#10b981', icon: 'bi-arrow-down-circle-fill' },
          { label: 'Total Withdrawals', amount: totalWithdrawals, count: filtered.filter(t => t.type === 'withdraw').length, color: '#ef4444', icon: 'bi-arrow-up-circle-fill' },
          { label: 'Total Transfers', amount: totalTransfers, count: filtered.filter(t => t.type === 'transfer').length, color: '#3b82f6', icon: 'bi-arrow-left-right' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ border: `1px solid ${s.color}30` }}>
            <div className="card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: '1.2rem', flexShrink: 0 }}>
                  <i className={`bi ${s.icon}`}></i>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: s.color }}>{formatCurrency(s.amount)}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.count} transactions</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Filters */}
        <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ minWidth: 220 }}>
            <i className="bi bi-search"></i>
            <input placeholder="Search by ID, account, description..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="field-select" style={{ width: 140 }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="all">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
            <option value="transfer">Transfer</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From:</label>
            <input type="date" className="field-input" style={{ width: 145 }} value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To:</label>
            <input type="date" className="field-input" style={{ width: 145 }} value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
          </div>
          {(search || typeFilter !== 'all' || dateFrom || dateTo) && (
            <button className="btn btn-outline btn-sm" onClick={clearFilters}><i className="bi bi-x-circle"></i> Clear</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-clock-history"></i>
            <h3>No Transactions Found</h3>
            <p>Try adjusting your search or date filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>Account</th>
                  <th>To/From</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Bal. After</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((txn, idx) => (
                  <tr key={txn.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{(page - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td><span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{txn.transactionId}</span></td>
                    <td>
                      <span className={`txn-type ${txn.type}`}>
                        <i className={`bi ${txn.type === 'deposit' ? 'bi-arrow-down-circle-fill' : txn.type === 'withdraw' ? 'bi-arrow-up-circle-fill' : 'bi-arrow-left-right'}`}></i>
                        {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                      </span>
                    </td>
                    <td><span className="font-mono" style={{ fontSize: '0.78rem' }}>{txn.accountNumber}</span></td>
                    <td>
                      {txn.type === 'transfer' ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          → <span className="font-mono">{txn.toAccount}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`txn-amount ${txn.type}`} style={{ fontSize: '0.875rem' }}>
                        {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </span>
                    </td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{txn.description}</td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{formatCurrency(txn.balanceAfter)}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(txn.createdAt)}</td>
                    <td><span className={`badge badge-${txn.status === 'success' ? 'success' : 'danger'}`}>{txn.status}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline btn-icon" title="View Details" onClick={() => setViewTxn(txn)}>
                        <i className="bi bi-eye-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </div>
            <div className="pagination-btns">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}><i className="bi bi-chevron-double-left"></i></button>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><i className="bi bi-chevron-left"></i></button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
                return p <= totalPages ? (
                  <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ) : null;
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><i className="bi bi-chevron-right"></i></button>
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><i className="bi bi-chevron-double-right"></i></button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {viewTxn && (
        <div className="modal-overlay" onClick={() => setViewTxn(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="bi bi-receipt-cutoff"></i> Transaction Details</h3>
              <button className="modal-close" onClick={() => setViewTxn(null)}><i className="bi bi-x"></i></button>
            </div>
            <div className="modal-body">
              <div className="receipt">
                <div className="receipt-header">
                  <div className="receipt-icon success"><i className="bi bi-check-circle-fill"></i></div>
                  <div className="receipt-title">{viewTxn.type.charAt(0).toUpperCase() + viewTxn.type.slice(1)} Receipt</div>
                </div>
                <div className="receipt-amount">{formatCurrency(viewTxn.amount)}</div>
                <hr className="receipt-divider" />
                {[
                  { label: 'Transaction ID', value: viewTxn.transactionId },
                  { label: 'Type', value: viewTxn.type.toUpperCase() },
                  { label: 'Account', value: viewTxn.accountNumber },
                  ...(viewTxn.toAccount ? [{ label: 'To Account', value: viewTxn.toAccount }] : []),
                  { label: 'Description', value: viewTxn.description },
                  { label: 'Balance Before', value: formatCurrency(viewTxn.balanceBefore) },
                  { label: 'Balance After', value: formatCurrency(viewTxn.balanceAfter) },
                  { label: 'Date & Time', value: formatDateTime(viewTxn.createdAt) },
                  { label: 'Status', value: `✅ ${viewTxn.status.toUpperCase()}` },
                ].map((r, i) => (
                  <div key={i} className="receipt-row">
                    <span className="receipt-label">{r.label}</span>
                    <span className="receipt-value" style={{ maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewTxn(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => {
                const content = `NexaBank Receipt\nID: ${viewTxn.transactionId}\nType: ${viewTxn.type}\nAmount: ${formatCurrency(viewTxn.amount)}\nAccount: ${viewTxn.accountNumber}\nDate: ${formatDateTime(viewTxn.createdAt)}`;
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `${viewTxn.transactionId}.txt`; a.click();
                showToast({ type: 'success', title: 'Downloaded', message: 'Receipt downloaded.' });
              }}>
                <i className="bi bi-download"></i> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
