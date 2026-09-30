// ============================================================
// Settings & Profile Component
// ============================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, ThemeMode, Transaction } from '../types';
import { getUsers, saveUsers, saveCurrentUser, getPrintSettings, savePrintSettings, getTransactions } from '../utils/storage';
import {
  compressProfileImage,
  formatCurrency,
  formatDateTime,
  isBillPaymentTransaction,
  printTransactionReceipt,
  printTransactionsStatement,
} from '../utils/helpers';
import { ToastData } from './Toast';

interface SettingsProps {
  currentUser: User;
  theme: ThemeMode;
  onThemeToggle: () => void;
  showToast: (t: Omit<ToastData, 'id'>) => void;
  onUserUpdate: (user: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, theme, onThemeToggle, showToast, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [printBankTitle, setPrintBankTitle] = useState(getPrintSettings().bankTitle);
  const [printFooterNote, setPrintFooterNote] = useState(getPrintSettings().footerNote);
  const [billFilter, setBillFilter] = useState<'bills' | 'all'>('bills');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'printing') {
      setTransactions(getTransactions());
      const settings = getPrintSettings();
      setPrintBankTitle(settings.bankTitle);
      setPrintFooterNote(settings.footerNote);
    }
  }, [activeTab]);

  const printSettings = useMemo(
    () => ({ bankTitle: printBankTitle.trim() || 'NexaBank', footerNote: printFooterNote.trim() }),
    [printBankTitle, printFooterNote],
  );

  const printableTransactions = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const list =
      billFilter === 'bills' ? sorted.filter(isBillPaymentTransaction) : sorted;
    return list.slice(0, 25);
  }, [transactions, billFilter]);

  const handleSavePrintSettings = () => {
    savePrintSettings(printSettings);
    showToast({ type: 'success', title: 'Saved', message: 'Print settings updated for all receipts.' });
  };

  const handlePrintReceipt = (transaction: Transaction) => {
    printTransactionReceipt(transaction, printSettings);
    showToast({ type: 'info', title: 'Print', message: 'Receipt sent to your printer dialog.' });
  };

  const handlePrintBillBatch = () => {
    if (printableTransactions.length === 0) {
      showToast({ type: 'warning', title: 'No records', message: 'No transactions match this filter.' });
      return;
    }
    printTransactionsStatement(
      printableTransactions,
      billFilter === 'bills' ? 'Bill & Utility Payments' : 'Recent Transactions',
      `Showing ${printableTransactions.length} record(s)`,
      printSettings,
    );
  };

  const handlePrintMiniStatement = () => {
    const mini = [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
    if (mini.length === 0) {
      showToast({ type: 'warning', title: 'No records', message: 'No transactions to print.' });
      return;
    }
    printTransactionsStatement(mini, 'Mini Statement', 'Last 10 transactions', printSettings);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setAvatar(await compressProfileImage(file))
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Image too large',
        message: err instanceof Error ? err.message : 'Could not use this image.',
      })
    }
    e.target.value = ''
  }

  const handleProfileSave = () => {
    if (!name.trim()) { showToast({ type: 'error', title: 'Error', message: 'Name cannot be empty.' }); return; }
    const users = getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], name, username, avatar };
      saveUsers(users);
      saveCurrentUser(users[idx]);
      onUserUpdate(users[idx]);
      showToast({ type: 'success', title: 'Profile Updated', message: 'Your profile has been saved.' });
    }
  };

  const handlePasswordChange = () => {
    const users = getUsers();
    const user = users.find(u => u.id === currentUser.id);
    if (!user) return;
    if (user.password !== oldPass) { showToast({ type: 'error', title: 'Error', message: 'Current password is incorrect.' }); return; }
    if (newPass.length < 6) { showToast({ type: 'error', title: 'Error', message: 'New password must be at least 6 characters.' }); return; }
    if (newPass !== confirmPass) { showToast({ type: 'error', title: 'Error', message: 'Passwords do not match.' }); return; }
    const idx = users.findIndex(u => u.id === currentUser.id);
    users[idx].password = newPass;
    saveUsers(users);
    setOldPass(''); setNewPass(''); setConfirmPass('');
    showToast({ type: 'success', title: 'Password Changed', message: 'Your password has been updated.' });
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: 'bi-person-fill' },
    { id: 'security', label: 'Security', icon: 'bi-shield-lock-fill' },
    { id: 'printing', label: 'Bills & Print', icon: 'bi-printer-fill' },
    { id: 'appearance', label: 'Appearance', icon: 'bi-palette-fill' },
    { id: 'about', label: 'About', icon: 'bi-info-circle-fill' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Settings & Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar Tabs */}
        <div className="card">
          <div className="card-body" style={{ padding: '1rem' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                className={`sidebar-item ${activeTab === t.id ? 'active' : ''}`}
                style={{ width: '100%', margin: '0.1rem 0', borderRadius: '10px' }}
                onClick={() => setActiveTab(t.id)}
              >
                <i className={`bi ${t.icon}`}></i> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><i className="bi bi-person-fill"></i> Profile Information</div>
              </div>
              <div className="card-body">
                {/* Avatar */}
                <div className="avatar-upload" style={{ marginBottom: '2rem' }}>
                  <div className="avatar-preview" style={{ width: 120, height: 120, fontSize: '3rem', borderRadius: '50%' }}
                    onClick={() => fileRef.current?.click()}>
                    {avatar ? <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <i className="bi bi-person-fill"></i>}
                    <div className="avatar-overlay"><i className="bi bi-camera-fill"></i></div>
                  </div>
                  <div>
                    <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
                      <i className="bi bi-upload"></i> Upload Photo
                    </button>
                    {avatar && (
                      <button className="btn btn-sm" style={{ marginLeft: '0.5rem', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                        onClick={() => setAvatar('')}>
                        <i className="bi bi-x"></i> Remove
                      </button>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>JPG, PNG up to 5MB</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                </div>

                <div style={{ display: 'grid', gap: '1rem', maxWidth: 500 }}>
                  <div className="form-field">
                    <label className="field-label required">Full Name</label>
                    <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="form-field">
                    <label className="field-label required">Username</label>
                    <input className="field-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Role</label>
                    <input className="field-input" value={currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} readOnly style={{ opacity: 0.7 }} />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Last Login</label>
                    <input className="field-input" value={currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString() : 'N/A'} readOnly style={{ opacity: 0.7 }} />
                  </div>
                  <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handleProfileSave}>
                    <i className="bi bi-check2-all"></i> Save Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><i className="bi bi-shield-lock-fill"></i> Security Settings</div>
              </div>
              <div className="card-body">
                <h4 style={{ fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Change Password</h4>
                <div style={{ maxWidth: 400, display: 'grid', gap: '1rem' }}>
                  <div className="form-field">
                    <label className="field-label required">Current Password</label>
                    <div className="with-icon">
                      <i className="bi bi-lock-fill input-icon"></i>
                      <input type={showOld ? 'text' : 'password'} className="field-input" value={oldPass}
                        onChange={e => setOldPass(e.target.value)} placeholder="Current password" />
                      <button type="button" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onClick={() => setShowOld(v => !v)}>
                        <i className={`bi ${showOld ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="field-label required">New Password</label>
                    <div className="with-icon">
                      <i className="bi bi-lock-fill input-icon"></i>
                      <input type={showNew ? 'text' : 'password'} className="field-input" value={newPass}
                        onChange={e => setNewPass(e.target.value)} placeholder="New password (min 6 chars)" />
                      <button type="button" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onClick={() => setShowNew(v => !v)}>
                        <i className={`bi ${showNew ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="field-label required">Confirm New Password</label>
                    <input type="password" className="field-input" value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm password" />
                  </div>
                  <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handlePasswordChange}>
                    <i className="bi bi-shield-check"></i> Update Password
                  </button>
                </div>

                <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Security Info</h4>
                <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 400 }}>
                  {[
                    { icon: 'bi-shield-check-fill', label: 'Two-Factor Authentication', value: 'Enabled', color: '#10b981' },
                    { icon: 'bi-lock-fill', label: 'Session Timeout', value: '30 minutes', color: '#3b82f6' },
                    { icon: 'bi-eye-slash-fill', label: 'Login Alerts', value: 'Active', color: '#8b5cf6' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: '1.1rem' }}></i>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.label}</div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: item.color, fontWeight: 700 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bills & Print (System) */}
          {activeTab === 'printing' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><i className="bi bi-printer-fill"></i> Bills & Print</div>
              </div>
              <div className="card-body">
                <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Print transaction receipts, utility bills, and mini statements from System settings.
                </p>

                <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Receipt header</h4>
                <div style={{ display: 'grid', gap: '1rem', maxWidth: 520, marginBottom: '1.5rem' }}>
                  <div className="form-field">
                    <label className="field-label">Bank title on printouts</label>
                    <input
                      className="field-input"
                      value={printBankTitle}
                      onChange={e => setPrintBankTitle(e.target.value)}
                      placeholder="NexaBank"
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Footer note</label>
                    <textarea
                      className="field-input"
                      rows={2}
                      value={printFooterNote}
                      onChange={e => setPrintFooterNote(e.target.value)}
                      placeholder="Thank you message on receipts"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={handleSavePrintSettings}
                  >
                    <i className="bi bi-check2-all"></i> Save print settings
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={handlePrintBillBatch}>
                    <i className="bi bi-printer-fill"></i> Print list
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={handlePrintMiniStatement}>
                    <i className="bi bi-receipt"></i> Print mini statement
                  </button>
                </div>

                <div className="section-tabs" style={{ marginBottom: '1rem' }}>
                  {([
                    { id: 'bills' as const, label: 'Bills & utilities' },
                    { id: 'all' as const, label: 'All recent' },
                  ]).map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`section-tab ${billFilter === option.id ? 'active' : ''}`}
                      onClick={() => setBillFilter(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {printableTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            No transactions to show. Try &quot;All recent&quot; or add transactions in Banking.
                          </td>
                        </tr>
                      ) : (
                        printableTransactions.map(txn => (
                          <tr key={txn.id}>
                            <td className="font-mono" style={{ fontSize: '0.8rem' }}>{txn.transactionId}</td>
                            <td>{txn.description}</td>
                            <td>{formatCurrency(txn.amount)}</td>
                            <td style={{ fontSize: '0.8rem' }}>{formatDateTime(txn.createdAt)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                aria-label={`Print receipt for ${txn.transactionId}`}
                                onClick={() => handlePrintReceipt(txn)}
                              >
                                <i className="bi bi-printer"></i> Print
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><i className="bi bi-palette-fill"></i> Appearance</div>
              </div>
              <div className="card-body">
                <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Theme</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: 400 }}>
                  {[
                    { id: 'light', label: 'Light Mode', icon: 'bi-sun-fill', desc: 'Clean and bright interface' },
                    { id: 'dark', label: 'Dark Mode', icon: 'bi-moon-stars-fill', desc: 'Easy on the eyes at night' },
                  ].map(t => (
                    <div key={t.id}
                      onClick={() => { if (theme !== t.id) onThemeToggle(); }}
                      style={{
                        padding: '1.5rem', borderRadius: 12, cursor: 'pointer',
                        border: `2px solid ${theme === t.id ? 'var(--primary)' : 'var(--border)'}`,
                        background: theme === t.id ? 'var(--info-light)' : 'var(--bg-input)',
                        textAlign: 'center', transition: 'all 0.2s',
                      }}>
                      <i className={`bi ${t.icon}`} style={{ fontSize: '2rem', color: theme === t.id ? 'var(--primary)' : 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}></i>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                      {theme === t.id && <div style={{ marginTop: '0.5rem' }}><span className="badge badge-primary">Active</span></div>}
                    </div>
                  ))}
                </div>

                <h4 style={{ fontWeight: 700, margin: '2rem 0 1rem', color: 'var(--text-primary)' }}>Color Scheme</h4>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {['#1a56db', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2'].map(color => (
                    <div key={color} style={{ width: 40, height: 40, borderRadius: '50%', background: color, cursor: 'pointer', border: color === '#1a56db' ? '3px solid var(--text-primary)' : '3px solid transparent', transition: 'transform 0.2s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title"><i className="bi bi-info-circle-fill"></i> About NexaBank</div>
              </div>
              <div className="card-body">
                <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #1a56db, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
                    <i className="bi bi-bank2"></i>
                  </div>
                  <h2 style={{ fontWeight: 900, fontSize: '2rem', marginBottom: '0.5rem' }}>NexaBank</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Premium Banking Management System</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Version 2.0.0 — 2025</p>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 500, margin: '0 auto' }}>
                  {[
                    { label: 'Platform', value: 'React + TypeScript' },
                    { label: 'Storage', value: 'LocalStorage (JSON)' },
                    { label: 'Charts', value: 'Chart.js v4' },
                    { label: 'Icons', value: 'Bootstrap Icons v1.11' },
                    { label: 'Fonts', value: 'Inter + Poppins' },
                    { label: 'Build Tool', value: 'Vite' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, rgba(26,86,219,0.08), rgba(139,92,246,0.08))', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    NexaBank is a comprehensive banking management system built with modern web technologies.
                    It provides full CRUD operations, transaction management, analytics, and export capabilities.
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                    🏦 Built with ❤️ for Pakistan's Digital Banking Future
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
