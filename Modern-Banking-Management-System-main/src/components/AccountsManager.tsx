// ============================================================
// Accounts Manager — CRUD for Bank Accounts
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Account, AccountType, AccountStatus, Gender } from '../types';
import { getAccounts } from '../utils/storage';
import {
  createAccount, updateAccount, deleteAccount,
  validateEmail, validatePhone, validateCNIC,
  formatCurrency, formatDate, exportAccountsCSV, compressProfileImage,
} from '../utils/helpers';
import { ToastData } from './Toast';

interface AccountsManagerProps {
  showToast: (t: Omit<ToastData, 'id'>) => void;
  onNavigate: (section: string, data?: any) => void;
  openAccountId?: string | null;
  onAccountOpened?: () => void;
}

const ITEMS_PER_PAGE = 8;

const AccountsManager: React.FC<AccountsManagerProps> = ({ showToast, onNavigate: _onNavigate, openAccountId, onAccountOpened }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [viewAccount, setViewAccount] = useState<Account | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: '', cnic: '', phone: '', email: '',
    address: '', gender: 'male' as Gender,
    dateOfBirth: '', accountType: 'saving' as AccountType,
    status: 'active' as AccountStatus, balance: '',
    profilePicture: '',
  });

  const loadAccounts = () => setAccounts(getAccounts());

  useEffect(() => { loadAccounts(); }, []);

  // Auto-open profile modal when coming from navbar search
  useEffect(() => {
    if (openAccountId) {
      const all = getAccounts();
      const target = all.find(a => a.id === openAccountId);
      if (target) {
        setViewAccount(target);
        onAccountOpened?.();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAccountId]);

  const resetForm = () => {
    setForm({ fullName: '', cnic: '', phone: '', email: '', address: '', gender: 'male', dateOfBirth: '', accountType: 'saving', status: 'active', balance: '', profilePicture: '' });
    setErrors({});
  };

  const openCreate = () => { resetForm(); setEditAccount(null); setShowModal(true); };
  const openEdit = (acc: Account) => {
    setEditAccount(acc);
    setForm({
      fullName: acc.fullName, cnic: acc.cnic, phone: acc.phone,
      email: acc.email, address: acc.address, gender: acc.gender,
      dateOfBirth: acc.dateOfBirth, accountType: acc.accountType,
      status: acc.status, balance: String(acc.balance),
      profilePicture: acc.profilePicture || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.cnic.trim()) errs.cnic = 'CNIC is required.';
    else if (!validateCNIC(form.cnic)) errs.cnic = 'Invalid CNIC format (e.g. 35202-1234567-1).';
    if (!form.phone.trim()) errs.phone = 'Phone is required.';
    else if (!validatePhone(form.phone)) errs.phone = 'Invalid Pakistani phone number.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!validateEmail(form.email)) errs.email = 'Invalid email address.';
    if (!form.address.trim()) errs.address = 'Address is required.';
    if (!form.dateOfBirth) errs.dateOfBirth = 'Date of birth is required.';
    if (form.balance !== '' && isNaN(parseFloat(form.balance))) errs.balance = 'Enter a valid amount.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    try {
      if (editAccount) {
        updateAccount(editAccount.id, {
          fullName: form.fullName, cnic: form.cnic, phone: form.phone,
          email: form.email, address: form.address, gender: form.gender,
          dateOfBirth: form.dateOfBirth, accountType: form.accountType,
          status: form.status, balance: parseFloat(form.balance) || editAccount.balance,
          profilePicture: form.profilePicture,
        });
        showToast({ type: 'success', title: 'Account Updated', message: `${form.fullName}'s account has been updated.` });
      } else {
        createAccount({
          fullName: form.fullName, cnic: form.cnic, phone: form.phone,
          email: form.email, address: form.address, gender: form.gender,
          dateOfBirth: form.dateOfBirth, accountType: form.accountType,
          status: form.status, balance: parseFloat(form.balance) || 0,
          profilePicture: form.profilePicture,
        });
        showToast({ type: 'success', title: 'Account Created', message: `Account for ${form.fullName} created successfully!` });
      }
      setShowModal(false);
      loadAccounts();
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Error', message: err instanceof Error ? err.message : 'Operation failed.' });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    try {
      deleteAccount(deleteTarget.id);
      showToast({ type: 'success', title: 'Account Deleted', message: `Account ${deleteTarget.accountNumber} removed.` });
      setDeleteTarget(null);
      loadAccounts();
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Error', message: err instanceof Error ? err.message : 'Delete failed.' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const profilePicture = await compressProfileImage(file)
      setForm(f => ({ ...f, profilePicture }))
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Image too large',
        message: err instanceof Error ? err.message : 'Could not use this image.',
      })
    }
    e.target.value = ''
  }

  const handleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  // Filter & Sort
  let filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.fullName.toLowerCase().includes(q) || a.accountNumber.toLowerCase().includes(q) || a.cnic.includes(q) || a.email.toLowerCase().includes(q) || a.phone.includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchType = typeFilter === 'all' || a.accountType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  filtered.sort((a: any, b: any) => {
    let av = a[sortBy], bv = b[sortBy];
    if (sortBy === 'balance') { av = Number(av); bv = Number(bv); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const SortIcon = ({ field }: { field: string }) => (
    <i className={`bi ${sortBy === field ? (sortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up'}`}
      style={{ fontSize: '0.75rem', marginLeft: '4px', opacity: sortBy === field ? 1 : 0.4 }}></i>
  );

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { active: 'success', inactive: 'gray', frozen: 'info' };
    return <span className={`badge badge-${map[status] || 'gray'}`}><span className={`status-dot ${status}`}></span>{status}</span>;
  };

  const typeBadge = (type: string) => {
    const map: Record<string, string> = { saving: 'primary', current: 'success', business: 'purple' };
    return <span className={`badge badge-${map[type] || 'gray'}`}>{type}</span>;
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>Account Management</h1>
          <p>Create, manage and monitor all bank accounts</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => exportAccountsCSV(filtered)}>
            <i className="bi bi-download"></i> Export CSV
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-person-plus-fill"></i> New Account
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-input-wrap" style={{ maxWidth: 300 }}>
            <i className="bi bi-search"></i>
            <input placeholder="Search by name, account, CNIC..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="field-select" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="frozen">Frozen</option>
          </select>
          <select className="field-select" style={{ width: 140 }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="all">All Types</option>
            <option value="saving">Saving</option>
            <option value="current">Current</option>
            <option value="business">Business</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {filtered.length} account{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-people"></i>
            <h3>No Accounts Found</h3>
            <p>Try adjusting your search or create a new account.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={openCreate}>
              <i className="bi bi-person-plus-fill"></i> Create Account
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', fontFamily: 'inherit' }}
                      onClick={() => handleSort('fullName')}>
                      Account Holder <SortIcon field="fullName" />
                    </button>
                  </th>
                  <th>Account No.</th>
                  <th>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', fontFamily: 'inherit' }}
                      onClick={() => handleSort('accountType')}>
                      Type <SortIcon field="accountType" />
                    </button>
                  </th>
                  <th>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', fontFamily: 'inherit' }}
                      onClick={() => handleSort('balance')}>
                      Balance <SortIcon field="balance" />
                    </button>
                  </th>
                  <th>Status</th>
                  <th>CNIC</th>
                  <th>Phone</th>
                  <th>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', fontFamily: 'inherit' }}
                      onClick={() => handleSort('createdAt')}>
                      Created <SortIcon field="createdAt" />
                    </button>
                  </th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(acc => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                          background: acc.profilePicture ? 'transparent' : 'linear-gradient(135deg, #1a56db, #8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden',
                        }}>
                          {acc.profilePicture ? <img src={acc.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : acc.fullName.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{acc.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{acc.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>{acc.accountNumber}</span></td>
                    <td>{typeBadge(acc.accountType)}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(acc.balance)}</span></td>
                    <td>{statusBadge(acc.status)}</td>
                    <td><span className="font-mono" style={{ fontSize: '0.8rem' }}>{acc.cnic}</span></td>
                    <td>{acc.phone}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(acc.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button className="btn btn-sm btn-outline btn-icon" title="View Profile" onClick={() => setViewAccount(acc)}>
                          <i className="bi bi-eye-fill"></i>
                        </button>
                        <button className="btn btn-sm btn-primary btn-icon" title="Edit" onClick={() => openEdit(acc)}>
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button className="btn btn-sm btn-danger btn-icon" title="Delete" onClick={() => setDeleteTarget(acc)}>
                          <i className="bi bi-trash3-fill"></i>
                        </button>
                      </div>
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
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className={`bi ${editAccount ? 'bi-pencil-fill' : 'bi-person-plus-fill'}`}></i>{editAccount ? 'Edit Account' : 'Create New Account'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x"></i></button>
            </div>
            <div className="modal-body">
              {/* Avatar Upload */}
              <div className="avatar-upload">
                <div className="avatar-preview" onClick={() => fileRef.current?.click()}>
                  {form.profilePicture ? (
                    <img src={form.profilePicture} alt="Profile" />
                  ) : (
                    <i className="bi bi-person-fill" style={{ fontSize: '2.5rem' }}></i>
                  )}
                  <div className="avatar-overlay"><i className="bi bi-camera-fill"></i></div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
                    <i className="bi bi-upload"></i> Upload Photo
                  </button>
                  {form.profilePicture && (
                    <button type="button" className="btn btn-sm" style={{ marginLeft: '0.5rem', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                      onClick={() => setForm(f => ({ ...f, profilePicture: '' }))}>
                      <i className="bi bi-x"></i> Remove
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="field-label required">Full Name</label>
                  <input className={`field-input ${errors.fullName ? 'error' : ''}`} placeholder="Muhammad Ali Khan"
                    value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                  {errors.fullName && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{errors.fullName}</div>}
                </div>
                <div className="form-field">
                  <label className="field-label required">CNIC</label>
                  <input className={`field-input ${errors.cnic ? 'error' : ''}`} placeholder="35202-1234567-1"
                    value={form.cnic} onChange={e => setForm(f => ({ ...f, cnic: e.target.value }))} />
                  {errors.cnic && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{errors.cnic}</div>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="field-label required">Phone Number</label>
                  <input className={`field-input ${errors.phone ? 'error' : ''}`} placeholder="03001234567"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  {errors.phone && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{errors.phone}</div>}
                </div>
                <div className="form-field">
                  <label className="field-label required">Email Address</label>
                  <input type="email" className={`field-input ${errors.email ? 'error' : ''}`} placeholder="user@email.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  {errors.email && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{errors.email}</div>}
                </div>
              </div>

              <div className="form-field">
                <label className="field-label required">Address</label>
                <textarea className={`field-textarea ${errors.address ? 'error' : ''}`} placeholder="Full address..."
                  value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} />
                {errors.address && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{errors.address}</div>}
              </div>

              <div className="form-row-3">
                <div className="form-field">
                  <label className="field-label required">Gender</label>
                  <select className="field-select" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as Gender }))}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="field-label required">Date of Birth</label>
                  <input type="date" className={`field-input ${errors.dateOfBirth ? 'error' : ''}`}
                    value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                  {errors.dateOfBirth && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{errors.dateOfBirth}</div>}
                </div>
                <div className="form-field">
                  <label className="field-label required">Account Type</label>
                  <select className="field-select" value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value as AccountType }))}>
                    <option value="saving">Saving Account</option>
                    <option value="current">Current Account</option>
                    <option value="business">Business Account</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="field-label">Initial Balance (PKR)</label>
                  <input type="number" className={`field-input ${errors.balance ? 'error' : ''}`} placeholder="0.00" min="0"
                    value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
                  {errors.balance && <div className="field-error"><i className="bi bi-exclamation-circle"></i>{errors.balance}</div>}
                </div>
                <div className="form-field">
                  <label className="field-label">Account Status</label>
                  <select className="field-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AccountStatus }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="frozen">Frozen</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                <i className={`bi ${editAccount ? 'bi-check2-all' : 'bi-person-plus-fill'}`}></i>
                {editAccount ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {viewAccount && (
        <div className="modal-overlay" onClick={() => setViewAccount(null)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <div className="profile-avatar">
                {viewAccount.profilePicture
                  ? <img src={viewAccount.profilePicture} alt="" />
                  : <i className="bi bi-person-fill"></i>}
              </div>
              <div className="profile-info">
                <h2>{viewAccount.fullName}</h2>
                <div className="profile-num"><i className="bi bi-credit-card-2-front"></i> {viewAccount.accountNumber}</div>
                <div className="profile-status" style={{ marginTop: '0.5rem' }}>
                  <span className={`badge badge-${viewAccount.status === 'active' ? 'success' : 'gray'}`}>
                    <span className={`status-dot ${viewAccount.status}`}></span>{viewAccount.status}
                  </span>
                  <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>{viewAccount.accountType}</span>
                </div>
              </div>
              <button className="modal-close" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
                onClick={() => setViewAccount(null)}><i className="bi bi-x"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="account-mini-card">
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.4rem', position: 'relative', zIndex: 1 }}>Available Balance</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, position: 'relative', zIndex: 1 }}>{formatCurrency(viewAccount.balance)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { label: 'CNIC', value: viewAccount.cnic, icon: 'bi-person-badge' },
                    { label: 'Phone', value: viewAccount.phone, icon: 'bi-telephone-fill' },
                    { label: 'Email', value: viewAccount.email, icon: 'bi-envelope-fill' },
                    { label: 'Gender', value: viewAccount.gender, icon: 'bi-gender-ambiguous' },
                    { label: 'Date of Birth', value: viewAccount.dateOfBirth, icon: 'bi-calendar-heart-fill' },
                    { label: 'Created', value: formatDate(viewAccount.createdAt), icon: 'bi-calendar-check' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'var(--bg-input)', borderRadius: '10px', padding: '0.85rem', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        <i className={`bi ${item.icon}`} style={{ marginRight: '0.3rem' }}></i>{item.label}
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-input)', borderRadius: '10px', padding: '0.85rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    <i className="bi bi-geo-alt-fill" style={{ marginRight: '0.3rem' }}></i>Address
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{viewAccount.address}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewAccount(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setViewAccount(null); openEdit(viewAccount); }}>
                <i className="bi bi-pencil-fill"></i> Edit Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="confirm-icon danger"><i className="bi bi-trash3-fill"></i></div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 700 }}>Delete Account?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                You are about to delete the account of <strong>{deleteTarget.fullName}</strong>.
              </p>
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                <i className="bi bi-exclamation-triangle-fill"></i> This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  <i className="bi bi-trash3-fill"></i> Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsManager;
