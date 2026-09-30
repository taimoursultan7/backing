// ============================================================
// Transactions Component — Deposit, Withdraw, Transfer
// ============================================================

import React, { useState, useEffect } from 'react';
import { Account, Transaction } from '../types';
import { getAccounts, getTransactions } from '../utils/storage';
import { deposit, withdraw, transfer, formatCurrency, formatDateTime, exportTransactionsCSV } from '../utils/helpers';
import { ToastData } from './Toast';

interface TransactionsProps {
  showToast: (t: Omit<ToastData, 'id'>) => void;
  initialTab?: string;
}

const Transactions: React.FC<TransactionsProps> = ({ showToast, initialTab = 'deposit' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ action: () => void; msg: string } | null>(null);

  // Deposit form
  const [depAccount, setDepAccount] = useState('');
  const [depAmount, setDepAmount] = useState('');
  const [depDesc, setDepDesc] = useState('');
  const [depErrors, setDepErrors] = useState<Record<string, string>>({});

  // Withdraw form
  const [witAccount, setWitAccount] = useState('');
  const [witAmount, setWitAmount] = useState('');
  const [witDesc, setWitDesc] = useState('');
  const [witErrors, setWitErrors] = useState<Record<string, string>>({});

  // Transfer form
  const [tfrFrom, setTfrFrom] = useState('');
  const [tfrTo, setTfrTo] = useState('');
  const [tfrAmount, setTfrAmount] = useState('');
  const [tfrDesc, setTfrDesc] = useState('');
  const [tfrErrors, setTfrErrors] = useState<Record<string, string>>({});

  const load = () => {
    setAccounts(getAccounts());
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const selectedDepAcc = accounts.find(a => a.id === depAccount);
  const selectedWitAcc = accounts.find(a => a.id === witAccount);
  const selectedTfrFrom = accounts.find(a => a.id === tfrFrom);

  const handleDeposit = () => {
    const errs: Record<string, string> = {};
    if (!depAccount) errs.account = 'Please select an account.';
    if (!depAmount || parseFloat(depAmount) <= 0) errs.amount = 'Enter a valid amount.';
    setDepErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setConfirm({
      msg: `Deposit ${formatCurrency(parseFloat(depAmount))} to ${selectedDepAcc?.fullName}?`,
      action: () => {
        setLoading(true);
        setTimeout(() => {
          try {
            const txn = deposit(depAccount, parseFloat(depAmount), depDesc || 'Cash Deposit');
            setReceipt(txn);
            setDepAccount(''); setDepAmount(''); setDepDesc('');
            showToast({ type: 'success', title: 'Deposit Successful!', message: `${formatCurrency(parseFloat(depAmount))} deposited successfully.` });
            load();
          } catch (err: unknown) {
            showToast({ type: 'error', title: 'Deposit Failed', message: err instanceof Error ? err.message : 'Error.' });
          }
          setLoading(false);
        }, 600);
      },
    });
  };

  const handleWithdraw = () => {
    const errs: Record<string, string> = {};
    if (!witAccount) errs.account = 'Please select an account.';
    if (!witAmount || parseFloat(witAmount) <= 0) errs.amount = 'Enter a valid amount.';
    else if (selectedWitAcc && parseFloat(witAmount) > selectedWitAcc.balance) errs.amount = 'Insufficient balance.';
    setWitErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setConfirm({
      msg: `Withdraw ${formatCurrency(parseFloat(witAmount))} from ${selectedWitAcc?.fullName}?`,
      action: () => {
        setLoading(true);
        setTimeout(() => {
          try {
            const txn = withdraw(witAccount, parseFloat(witAmount), witDesc || 'Cash Withdrawal');
            setReceipt(txn);
            setWitAccount(''); setWitAmount(''); setWitDesc('');
            showToast({ type: 'success', title: 'Withdrawal Successful!', message: `${formatCurrency(parseFloat(witAmount))} withdrawn successfully.` });
            load();
          } catch (err: unknown) {
            showToast({ type: 'error', title: 'Withdrawal Failed', message: err instanceof Error ? err.message : 'Error.' });
          }
          setLoading(false);
        }, 600);
      },
    });
  };

  const handleTransfer = () => {
    const errs: Record<string, string> = {};
    if (!tfrFrom) errs.from = 'Please select source account.';
    if (!tfrTo.trim()) errs.to = 'Enter destination account number.';
    if (!tfrAmount || parseFloat(tfrAmount) <= 0) errs.amount = 'Enter a valid amount.';
    else if (selectedTfrFrom && parseFloat(tfrAmount) > selectedTfrFrom.balance) errs.amount = 'Insufficient balance.';
    setTfrErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setConfirm({
      msg: `Transfer ${formatCurrency(parseFloat(tfrAmount))} to account ${tfrTo}?`,
      action: () => {
        setLoading(true);
        setTimeout(() => {
          try {
            const txn = transfer(tfrFrom, tfrTo, parseFloat(tfrAmount), tfrDesc || 'Fund Transfer');
            setReceipt(txn);
            setTfrFrom(''); setTfrTo(''); setTfrAmount(''); setTfrDesc('');
            showToast({ type: 'success', title: 'Transfer Successful!', message: `${formatCurrency(parseFloat(tfrAmount))} transferred successfully.` });
            load();
          } catch (err: unknown) {
            showToast({ type: 'error', title: 'Transfer Failed', message: err instanceof Error ? err.message : 'Error.' });
          }
          setLoading(false);
        }, 600);
      },
    });
  };

  const activeAccounts = accounts.filter(a => a.status === 'active');
  const tabs = [
    { id: 'deposit', label: 'Deposit', icon: 'bi-arrow-down-circle-fill', color: '#10b981' },
    { id: 'withdraw', label: 'Withdraw', icon: 'bi-arrow-up-circle-fill', color: '#ef4444' },
    { id: 'transfer', label: 'Transfer', icon: 'bi-arrow-left-right', color: '#3b82f6' },
    { id: 'balance', label: 'Balance Inquiry', icon: 'bi-wallet2', color: '#8b5cf6' },
    { id: 'mini', label: 'Mini Statement', icon: 'bi-receipt', color: '#f59e0b' },
  ];

  const AccountCard = ({ account }: { account: Account | undefined }) => {
    if (!account) return null;
    return (
      <div style={{
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        borderRadius: 12, padding: '1rem 1.25rem', color: 'white', marginBottom: '1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginBottom: '0.2rem' }}>Account Holder</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{account.fullName}</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '0.2rem', fontFamily: 'monospace' }}>{account.accountNumber}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>Balance</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{formatCurrency(account.balance)}</div>
          <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
            {account.accountType}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>Banking Transactions</h1>
        <p>Deposit, Withdraw, Transfer and check balances</p>
      </div>

      <div className="section-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`section-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            style={activeTab === t.id ? { background: t.color, borderColor: t.color } : {}}>
            <i className={`bi ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Form */}
        <div>
          {/* DEPOSIT */}
          {activeTab === 'deposit' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ color: '#10b981' }}><i className="bi bi-arrow-down-circle-fill"></i> Deposit Money</div>
              </div>
              <div className="card-body">
                <div className="form-field">
                  <label className="field-label required">Select Account</label>
                  <select className={`field-select ${depErrors.account ? 'error' : ''}`} value={depAccount}
                    onChange={e => { setDepAccount(e.target.value); setDepErrors({}); }}>
                    <option value="">-- Select Account --</option>
                    {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.fullName} — {a.accountNumber}</option>)}
                  </select>
                  {depErrors.account && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{depErrors.account}</div>}
                </div>
                <AccountCard account={selectedDepAcc} />
                <div className="form-field">
                  <label className="field-label required">Amount (PKR)</label>
                  <div className="with-icon">
                    <i className="bi bi-currency-rupee input-icon"></i>
                    <input type="number" className={`field-input ${depErrors.amount ? 'error' : ''}`} placeholder="0.00" min="1"
                      value={depAmount} onChange={e => setDepAmount(e.target.value)} />
                  </div>
                  {depErrors.amount && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{depErrors.amount}</div>}
                </div>
                <div className="form-field">
                  <label className="field-label">Description</label>
                  <input className="field-input" placeholder="e.g. Salary credit, Cash deposit..."
                    value={depDesc} onChange={e => setDepDesc(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {[1000, 5000, 10000, 25000, 50000, 100000].map(amt => (
                    <button key={amt} className="btn btn-outline btn-sm" onClick={() => setDepAmount(String(amt))}>
                      ₨{(amt/1000).toFixed(0)}K
                    </button>
                  ))}
                </div>
                <button className="btn btn-success btn-lg w-full" onClick={handleDeposit} disabled={loading}>
                  {loading ? <><i className="bi bi-arrow-clockwise" style={{ animation: 'spin 1s linear infinite' }}></i> Processing...</>
                    : <><i className="bi bi-arrow-down-circle-fill"></i> Deposit Now</>}
                </button>
              </div>
            </div>
          )}

          {/* WITHDRAW */}
          {activeTab === 'withdraw' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ color: '#ef4444' }}><i className="bi bi-arrow-up-circle-fill"></i> Withdraw Money</div>
              </div>
              <div className="card-body">
                <div className="form-field">
                  <label className="field-label required">Select Account</label>
                  <select className={`field-select ${witErrors.account ? 'error' : ''}`} value={witAccount}
                    onChange={e => { setWitAccount(e.target.value); setWitErrors({}); }}>
                    <option value="">-- Select Account --</option>
                    {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.fullName} — {a.accountNumber}</option>)}
                  </select>
                  {witErrors.account && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{witErrors.account}</div>}
                </div>
                <AccountCard account={selectedWitAcc} />
                <div className="form-field">
                  <label className="field-label required">Amount (PKR)</label>
                  <div className="with-icon">
                    <i className="bi bi-currency-rupee input-icon"></i>
                    <input type="number" className={`field-input ${witErrors.amount ? 'error' : ''}`} placeholder="0.00" min="1"
                      value={witAmount} onChange={e => setWitAmount(e.target.value)} />
                  </div>
                  {witErrors.amount && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{witErrors.amount}</div>}
                </div>
                <div className="form-field">
                  <label className="field-label">Description</label>
                  <input className="field-input" placeholder="e.g. ATM withdrawal, Utility bill..."
                    value={witDesc} onChange={e => setWitDesc(e.target.value)} />
                </div>
                {selectedWitAcc && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {[1000, 5000, 10000].filter(a => a <= selectedWitAcc.balance).map(amt => (
                      <button key={amt} className="btn btn-outline btn-sm" onClick={() => setWitAmount(String(amt))}>
                        ₨{(amt/1000).toFixed(0)}K
                      </button>
                    ))}
                    <button className="btn btn-outline btn-sm" onClick={() => setWitAmount(String(selectedWitAcc.balance))}>
                      All
                    </button>
                  </div>
                )}
                <button className="btn btn-danger btn-lg w-full" onClick={handleWithdraw} disabled={loading}>
                  {loading ? <><i className="bi bi-arrow-clockwise" style={{ animation: 'spin 1s linear infinite' }}></i> Processing...</>
                    : <><i className="bi bi-arrow-up-circle-fill"></i> Withdraw Now</>}
                </button>
              </div>
            </div>
          )}

          {/* TRANSFER */}
          {activeTab === 'transfer' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ color: '#3b82f6' }}><i className="bi bi-arrow-left-right"></i> Transfer Money</div>
              </div>
              <div className="card-body">
                <div className="form-field">
                  <label className="field-label required">From Account</label>
                  <select className={`field-select ${tfrErrors.from ? 'error' : ''}`} value={tfrFrom}
                    onChange={e => { setTfrFrom(e.target.value); setTfrErrors({}); }}>
                    <option value="">-- Select Source Account --</option>
                    {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.fullName} — {a.accountNumber}</option>)}
                  </select>
                  {tfrErrors.from && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{tfrErrors.from}</div>}
                </div>
                <AccountCard account={selectedTfrFrom} />
                <div className="form-field">
                  <label className="field-label required">To Account Number</label>
                  <div className="with-icon">
                    <i className="bi bi-send-fill input-icon"></i>
                    <input className={`field-input ${tfrErrors.to ? 'error' : ''}`} placeholder="e.g. NXB1234567890"
                      value={tfrTo} onChange={e => setTfrTo(e.target.value)} />
                  </div>
                  {tfrErrors.to && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{tfrErrors.to}</div>}
                  {tfrTo && accounts.find(a => a.accountNumber === tfrTo) && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--success-light)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="bi bi-check-circle-fill"></i>
                      {accounts.find(a => a.accountNumber === tfrTo)?.fullName}
                    </div>
                  )}
                </div>
                <div className="form-field">
                  <label className="field-label required">Amount (PKR)</label>
                  <div className="with-icon">
                    <i className="bi bi-currency-rupee input-icon"></i>
                    <input type="number" className={`field-input ${tfrErrors.amount ? 'error' : ''}`} placeholder="0.00" min="1"
                      value={tfrAmount} onChange={e => setTfrAmount(e.target.value)} />
                  </div>
                  {tfrErrors.amount && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{tfrErrors.amount}</div>}
                </div>
                <div className="form-field">
                  <label className="field-label">Description</label>
                  <input className="field-input" placeholder="e.g. Rent payment, Family transfer..."
                    value={tfrDesc} onChange={e => setTfrDesc(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-lg w-full" onClick={handleTransfer} disabled={loading}>
                  {loading ? <><i className="bi bi-arrow-clockwise" style={{ animation: 'spin 1s linear infinite' }}></i> Processing...</>
                    : <><i className="bi bi-arrow-left-right"></i> Transfer Now</>}
                </button>
              </div>
            </div>
          )}

          {/* BALANCE INQUIRY */}
          {activeTab === 'balance' && <BalanceInquiry accounts={accounts} />}

          {/* MINI STATEMENT */}
          {activeTab === 'mini' && <MiniStatement accounts={accounts} showToast={showToast} />}
        </div>

        {/* Right: Receipt or Tips */}
        <div>
          {receipt ? (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><i className="bi bi-receipt-cutoff"></i> Transaction Receipt</div>
                <button className="btn btn-outline btn-sm" onClick={() => setReceipt(null)}>
                  <i className="bi bi-x"></i> Close
                </button>
              </div>
              <div className="card-body">
                <div className="receipt">
                  <div className="receipt-header">
                    <div className="receipt-icon success">
                      <i className="bi bi-check-circle-fill"></i>
                    </div>
                    <div className="receipt-title">Transaction Successful</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>NexaBank Digital Receipt</div>
                  </div>
                  <div className="receipt-amount">{formatCurrency(receipt.amount)}</div>
                  <hr className="receipt-divider" />
                  {[
                    { label: 'Transaction ID', value: receipt.transactionId },
                    { label: 'Type', value: receipt.type.toUpperCase() },
                    { label: 'Account', value: receipt.accountNumber },
                    ...(receipt.toAccount ? [{ label: 'To Account', value: receipt.toAccount }] : []),
                    { label: 'Description', value: receipt.description },
                    { label: 'Balance Before', value: formatCurrency(receipt.balanceBefore) },
                    { label: 'Balance After', value: formatCurrency(receipt.balanceAfter) },
                    { label: 'Date & Time', value: formatDateTime(receipt.createdAt) },
                    { label: 'Status', value: '✅ SUCCESS' },
                  ].map((r, i) => (
                    <div key={i} className="receipt-row">
                      <span className="receipt-label">{r.label}</span>
                      <span className="receipt-value">{r.value}</span>
                    </div>
                  ))}
                  <hr className="receipt-divider" />
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <i className="bi bi-bank2"></i> NexaBank — Your Trusted Banking Partner<br />
                    Thank you for banking with us!
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="btn btn-outline flex-1" onClick={() => window.print()}>
                    <i className="bi bi-printer-fill"></i> Print
                  </button>
                  <button className="btn btn-primary flex-1" onClick={() => {
                    const content = `NexaBank Transaction Receipt\n${'='.repeat(40)}\nTransaction ID: ${receipt.transactionId}\nType: ${receipt.type.toUpperCase()}\nAmount: ${formatCurrency(receipt.amount)}\nAccount: ${receipt.accountNumber}\nBalance After: ${formatCurrency(receipt.balanceAfter)}\nDate: ${formatDateTime(receipt.createdAt)}\nStatus: SUCCESS`;
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `receipt_${receipt.transactionId}.txt`; a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <i className="bi bi-download"></i> Download
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <TransactionTips activeTab={activeTab} />
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="confirm-icon warning"><i className="bi bi-shield-check"></i></div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 700 }}>Confirm Transaction</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{confirm.msg}</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => { confirm.action(); setConfirm(null); }}>
                  <i className="bi bi-check2-all"></i> Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Balance Inquiry ─────────────────────────────────────────────
const BalanceInquiry: React.FC<{ accounts: Account[] }> = ({ accounts }) => {
  const [selected, setSelected] = useState('');
  const acc = accounts.find(a => a.id === selected);
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title" style={{ color: '#8b5cf6' }}><i className="bi bi-wallet2"></i> Balance Inquiry</div>
      </div>
      <div className="card-body">
        <div className="form-field">
          <label className="field-label required">Select Account</label>
          <select className="field-select" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">-- Select Account --</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.fullName} — {a.accountNumber}</option>)}
          </select>
        </div>
        {acc && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #7c3aed, #1a56db)',
              borderRadius: 16, padding: '2rem', color: 'white', textAlign: 'center',
            }}>
              <i className="bi bi-bank2" style={{ fontSize: '2.5rem', opacity: 0.8, display: 'block', marginBottom: '0.75rem' }}></i>
              <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.3rem' }}>Available Balance</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>{formatCurrency(acc.balance)}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, fontFamily: 'monospace' }}>{acc.accountNumber}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
              {[
                { label: 'Account Holder', value: acc.fullName },
                { label: 'Account Type', value: acc.accountType },
                { label: 'Status', value: acc.status },
                { label: 'CNIC', value: acc.cnic },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '0.75rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Mini Statement ──────────────────────────────────────────────
const MiniStatement: React.FC<{ accounts: Account[]; showToast: (t: Omit<ToastData, 'id'>) => void }> = ({ accounts, showToast: _showToast }) => {
  const [selected, setSelected] = useState('');
  const acc = accounts.find(a => a.id === selected);
  const txns = acc ? getTransactions().filter(t => t.accountNumber === acc.accountNumber).slice(0, 10) : [];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title" style={{ color: '#f59e0b' }}><i className="bi bi-receipt"></i> Mini Statement</div>
        {txns.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => exportTransactionsCSV(txns)}>
            <i className="bi bi-download"></i> CSV
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="form-field">
          <label className="field-label required">Select Account</label>
          <select className="field-select" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">-- Select Account --</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.fullName} — {a.accountNumber}</option>)}
          </select>
        </div>
        {acc && (
          <div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{acc.fullName}</span>
              <span style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(acc.balance)}</span>
            </div>
            {txns.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <i className="bi bi-inbox"></i>
                <h3>No Transactions</h3>
              </div>
            ) : (
              <div className="mini-stmt">
                {txns.map(t => (
                  <div key={t.id} className="mini-stmt-item">
                    <div className={`mini-stmt-icon ${t.type}`}>
                      <i className={`bi ${t.type === 'deposit' ? 'bi-arrow-down-circle' : t.type === 'withdraw' ? 'bi-arrow-up-circle' : 'bi-arrow-left-right'}`}></i>
                    </div>
                    <div className="mini-stmt-info">
                      <div className="mini-stmt-desc">{t.description}</div>
                      <div className="mini-stmt-date">{formatDateTime(t.createdAt)}</div>
                    </div>
                    <div className={`mini-stmt-amount ${t.type}`}>
                      {t.type === 'deposit' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Transaction Tips ────────────────────────────────────────────
const TransactionTips: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const tips: Record<string, { icon: string; color: string; title: string; points: string[] }> = {
    deposit: {
      icon: 'bi-arrow-down-circle-fill', color: '#10b981',
      title: 'Deposit Guidelines',
      points: ['Minimum deposit: ₨100', 'No maximum limit for savings', 'Deposit reflects immediately', 'Keep your receipt for records'],
    },
    withdraw: {
      icon: 'bi-arrow-up-circle-fill', color: '#ef4444',
      title: 'Withdrawal Guidelines',
      points: ['Ensure sufficient balance', 'Daily limit: ₨500,000', 'Account must be active', 'Withdrawal is instant'],
    },
    transfer: {
      icon: 'bi-arrow-left-right', color: '#3b82f6',
      title: 'Transfer Guidelines',
      points: ['Verify destination account', 'Transfer is immediate', 'Keep transaction ID', 'Both accounts must be active'],
    },
    balance: {
      icon: 'bi-wallet2', color: '#8b5cf6',
      title: 'Balance Inquiry',
      points: ['Real-time balance', 'No charges for inquiry', 'View account details', 'Available anytime'],
    },
    mini: {
      icon: 'bi-receipt', color: '#f59e0b',
      title: 'Mini Statement',
      points: ['Last 10 transactions', 'Download as CSV', 'Filter by date range', 'Print-ready format'],
    },
  };

  const tip = tips[activeTab] || tips.deposit;

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <i className={`bi ${tip.icon}`} style={{ fontSize: '3rem', color: tip.color, display: 'block', marginBottom: '0.75rem' }}></i>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>{tip.title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'left' }}>
              {tip.points.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <i className="bi bi-check-circle-fill" style={{ color: tip.color, flexShrink: 0 }}></i>
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <i className="bi bi-shield-lock-fill" style={{ color: 'var(--primary)', fontSize: '1.5rem', flexShrink: 0 }}></i>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>🔒 Secure Banking</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                All transactions are secured with bank-grade encryption. Your financial data is safe with NexaBank.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
