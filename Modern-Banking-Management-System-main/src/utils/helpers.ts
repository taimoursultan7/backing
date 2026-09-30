// ============================================================
// Helper / Utility Functions
// ============================================================

import { Account, Transaction, User, Notification } from '../types';
import {
  getAccounts, saveAccounts,
  getTransactions, saveTransactions,
  getUsers, saveUsers,
  getNotifications, saveNotifications,
} from './storage';

// ─── ID Generators ───────────────────────────────────────────
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function generateAccountNumber(): string {
  const prefix = 'NXB';
  const num = Math.floor(1000000000 + Math.random() * 9000000000);
  return `${prefix}${num}`;
}

export function generateTransactionId(): string {
  const prefix = 'TXN';
  const num = Math.floor(100000000 + Math.random() * 900000000);
  return `${prefix}${num}`;
}

// ─── Date Helpers ─────────────────────────────────────────────
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-PK', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function now(): string {
  return new Date().toISOString();
}

// ─── Currency Formatter ───────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Validation Helpers ──────────────────────────────────────
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  return /^(\+92|0)?3[0-9]{9}$/.test(phone.replace(/\s|-/g, ''));
}

export function validateCNIC(cnic: string): boolean {
  return /^\d{5}-?\d{7}-?\d{1}$/.test(cnic);
}

/** Resize profile uploads so localStorage stays under browser quota (~5MB). */
export const compressProfileImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const maxEdge = 240
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not process image.'))
        return
      }
      ctx.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image.'))
    }

    image.src = objectUrl
  })

// ─── Account CRUD ─────────────────────────────────────────────
export function createAccount(data: Omit<Account, 'id' | 'accountNumber' | 'createdAt' | 'updatedAt'>): Account {
  const accounts = getAccounts();
  // Check for duplicate CNIC or email
  const duplicate = accounts.find(a => a.cnic === data.cnic || a.email === data.email);
  if (duplicate) throw new Error('Account with this CNIC or Email already exists.');

  const account: Account = {
    ...data,
    id: generateId(),
    accountNumber: generateAccountNumber(),
    createdAt: now(),
    updatedAt: now(),
  };
  accounts.push(account);
  saveAccounts(accounts);
  addNotification('Account Created', `Account for ${account.fullName} created successfully.`, 'success');
  return account;
}

export function updateAccount(id: string, data: Partial<Account>): Account {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Account not found.');
  accounts[idx] = { ...accounts[idx], ...data, updatedAt: now() };
  saveAccounts(accounts);
  return accounts[idx];
}

export function deleteAccount(id: string): void {
  const accounts = getAccounts();
  const account = accounts.find(a => a.id === id);
  if (!account) throw new Error('Account not found.');
  const updated = accounts.filter(a => a.id !== id);
  saveAccounts(updated);
  addNotification('Account Deleted', `Account ${account.accountNumber} has been removed.`, 'warning');
}

export function getAccountById(id: string): Account | undefined {
  return getAccounts().find(a => a.id === id);
}

export function getAccountByNumber(number: string): Account | undefined {
  return getAccounts().find(a => a.accountNumber === number);
}

// ─── Transaction Operations ───────────────────────────────────
export function deposit(accountId: string, amount: number, description = 'Deposit'): Transaction {
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) throw new Error('Account not found.');
  if (accounts[idx].status !== 'active') throw new Error('Account is not active.');

  const balanceBefore = accounts[idx].balance;
  accounts[idx].balance += amount;
  accounts[idx].updatedAt = now();
  saveAccounts(accounts);

  const txn: Transaction = {
    id: generateId(),
    transactionId: generateTransactionId(),
    type: 'deposit',
    amount,
    accountNumber: accounts[idx].accountNumber,
    description,
    balanceBefore,
    balanceAfter: accounts[idx].balance,
    status: 'success',
    createdAt: now(),
  };
  const transactions = getTransactions();
  transactions.unshift(txn);
  saveTransactions(transactions);
  addNotification('Deposit Successful', `${formatCurrency(amount)} deposited to ${accounts[idx].accountNumber}.`, 'success');
  return txn;
}

export function withdraw(accountId: string, amount: number, description = 'Withdrawal'): Transaction {
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx === -1) throw new Error('Account not found.');
  if (accounts[idx].status !== 'active') throw new Error('Account is not active.');
  if (accounts[idx].balance < amount) throw new Error('Insufficient balance.');

  const balanceBefore = accounts[idx].balance;
  accounts[idx].balance -= amount;
  accounts[idx].updatedAt = now();
  saveAccounts(accounts);

  const txn: Transaction = {
    id: generateId(),
    transactionId: generateTransactionId(),
    type: 'withdraw',
    amount,
    accountNumber: accounts[idx].accountNumber,
    description,
    balanceBefore,
    balanceAfter: accounts[idx].balance,
    status: 'success',
    createdAt: now(),
  };
  const transactions = getTransactions();
  transactions.unshift(txn);
  saveTransactions(transactions);
  addNotification('Withdrawal Successful', `${formatCurrency(amount)} withdrawn from ${accounts[idx].accountNumber}.`, 'success');
  return txn;
}

export function transfer(fromId: string, toAccountNumber: string, amount: number, description = 'Transfer'): Transaction {
  if (amount <= 0) throw new Error('Amount must be greater than zero.');
  const accounts = getAccounts();
  const fromIdx = accounts.findIndex(a => a.id === fromId);
  const toIdx = accounts.findIndex(a => a.accountNumber === toAccountNumber);
  if (fromIdx === -1) throw new Error('Source account not found.');
  if (toIdx === -1) throw new Error('Destination account not found.');
  if (fromIdx === toIdx) throw new Error('Cannot transfer to the same account.');
  if (accounts[fromIdx].status !== 'active') throw new Error('Source account is not active.');
  if (accounts[toIdx].status !== 'active') throw new Error('Destination account is not active.');
  if (accounts[fromIdx].balance < amount) throw new Error('Insufficient balance.');

  const balanceBefore = accounts[fromIdx].balance;
  accounts[fromIdx].balance -= amount;
  accounts[toIdx].balance += amount;
  accounts[fromIdx].updatedAt = now();
  accounts[toIdx].updatedAt = now();
  saveAccounts(accounts);

  const txn: Transaction = {
    id: generateId(),
    transactionId: generateTransactionId(),
    type: 'transfer',
    amount,
    fromAccount: accounts[fromIdx].accountNumber,
    toAccount: accounts[toIdx].accountNumber,
    accountNumber: accounts[fromIdx].accountNumber,
    description,
    balanceBefore,
    balanceAfter: accounts[fromIdx].balance,
    status: 'success',
    createdAt: now(),
  };
  const transactions = getTransactions();
  transactions.unshift(txn);
  saveTransactions(transactions);
  addNotification('Transfer Successful', `${formatCurrency(amount)} transferred to ${toAccountNumber}.`, 'success');
  return txn;
}

// ─── User Auth ─────────────────────────────────────────────────
export function authenticateUser(username: string, password: string): User {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) throw new Error('Invalid username or password.');
  // Update last login
  const idx = users.findIndex(u => u.id === user.id);
  users[idx].lastLogin = now();
  saveUsers(users);
  return users[idx];
}

// ─── Notifications ─────────────────────────────────────────────
export function addNotification(title: string, message: string, type: Notification['type'] = 'info'): void {
  const notifications = getNotifications();
  const notif: Notification = {
    id: generateId(),
    title,
    message,
    type,
    read: false,
    createdAt: now(),
  };
  notifications.unshift(notif);
  // Keep only last 50
  saveNotifications(notifications.slice(0, 50));
}

export function markNotificationRead(id: string): void {
  const notifications = getNotifications();
  const idx = notifications.findIndex(n => n.id === id);
  if (idx !== -1) {
    notifications[idx].read = true;
    saveNotifications(notifications);
  }
}

export function markAllNotificationsRead(): void {
  const notifications = getNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(notifications);
}

// ─── Seed Default Data ────────────────────────────────────────
export function seedDefaultData(): void {
  const users = getUsers();
  let updatedUsers = [...users];

  if (users.length === 0) {
    const defaultUsers: User[] = [
      {
        id: generateId(),
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: 'System Administrator',
        lastLogin: now(),
      },
      {
        id: generateId(),
        username: 'employee',
        password: 'emp123',
        role: 'employee',
        name: 'Bank Employee',
        lastLogin: now(),
      },
    ];
    updatedUsers = defaultUsers;
  }

  // Ensure customer exists
  if (!updatedUsers.find(u => u.username === 'customer')) {
    updatedUsers.push({
      id: generateId(),
      username: 'customer',
      password: 'cust123',
      role: 'customer',
      name: 'Bank Customer',
      lastLogin: now(),
    });
  }

  if (updatedUsers.length !== users.length) {
    saveUsers(updatedUsers);
  }

  const accounts = getAccounts();
  if (accounts.length === 0) {
    // Create some sample accounts
    const sampleAccounts: Account[] = [

      {
        id: generateId(),
        accountNumber: 'NXB1234567890',
        accountType: 'saving',
        status: 'active',
        balance: 125000,
        fullName: 'Muhammad Ali Khan',
        cnic: '35202-1234567-1',
        phone: '03001234567',
        email: 'ali.khan@email.com',
        address: 'House 12, Block A, Gulberg, Lahore',
        gender: 'male',
        dateOfBirth: '1990-05-15',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now(),
      },
      {
        id: generateId(),
        accountNumber: 'NXB9876543210',
        accountType: 'current',
        status: 'active',
        balance: 350000,
        fullName: 'Fatima Zahra',
        cnic: '35202-7654321-2',
        phone: '03119876543',
        email: 'fatima.zahra@email.com',
        address: 'Flat 5, DHA Phase 4, Karachi',
        gender: 'female',
        dateOfBirth: '1985-11-22',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now(),
      },
      {
        id: generateId(),
        accountNumber: 'NXB5555666677',
        accountType: 'business',
        status: 'active',
        balance: 1500000,
        fullName: 'Ahmed Enterprises Ltd',
        cnic: '35202-9999888-3',
        phone: '03335556677',
        email: 'ahmed.ent@business.com',
        address: 'Office 301, Blue Area, Islamabad',
        gender: 'male',
        dateOfBirth: '1978-03-10',
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now(),
      },
      {
        id: generateId(),
        accountNumber: 'NXB1111222233',
        accountType: 'saving',
        status: 'inactive',
        balance: 45000,
        fullName: 'Sara Malik',
        cnic: '35202-1111222-4',
        phone: '03451112233',
        email: 'sara.malik@email.com',
        address: 'Street 7, Model Town, Faisalabad',
        gender: 'female',
        dateOfBirth: '1995-07-30',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now(),
      },
      {
        id: generateId(),
        accountNumber: 'NXB7777888899',
        accountType: 'current',
        status: 'active',
        balance: 280000,
        fullName: 'Hassan Raza Sheikh',
        cnic: '42201-7778889-9',
        phone: '03217778899',
        email: 'hassan.sheikh@email.com',
        address: 'B-120, PECHS Block 2, Karachi',
        gender: 'male',
        dateOfBirth: '1982-09-14',
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now(),
      },
      {
        id: generateId(),
        accountNumber: 'NXB4444555566',
        accountType: 'business',
        status: 'frozen',
        balance: 750000,
        fullName: 'Pak Tech Solutions',
        cnic: '61101-4445556-6',
        phone: '05114445566',
        email: 'info@paktech.com',
        address: 'Suite 12, F-11 Markaz, Islamabad',
        gender: 'male',
        dateOfBirth: '1975-12-01',
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now(),
      },
    ];
    saveAccounts(sampleAccounts);

    // Seed some transactions
    const makeTxn = (id: string, type: Transaction['type'], amount: number, acc: string, desc: string, daysAgo: number, bal: number, toAcc?: string): Transaction => ({
      id: generateId(), transactionId: `TXN${id}`, type, amount,
      accountNumber: acc, description: desc,
      fromAccount: type === 'transfer' ? acc : undefined,
      toAccount: type === 'transfer' ? toAcc : undefined,
      balanceBefore: bal, balanceAfter: type === 'deposit' ? bal + amount : bal - amount,
      status: 'success',
      createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    });

    const sampleTxns: Transaction[] = [
      makeTxn('100000001', 'deposit', 50000, 'NXB1234567890', 'Salary Credit', 2, 75000),
      makeTxn('100000002', 'withdraw', 15000, 'NXB9876543210', 'Cash Withdrawal', 1, 365000),
      makeTxn('100000003', 'transfer', 25000, 'NXB5555666677', 'Business Payment', 0, 1525000, 'NXB1234567890'),
      makeTxn('100000004', 'deposit', 100000, 'NXB5555666677', 'Client Payment', 5, 1400000),
      makeTxn('100000005', 'withdraw', 5000, 'NXB1111222233', 'ATM Withdrawal', 7, 50000),
      makeTxn('100000006', 'deposit', 75000, 'NXB9876543210', 'Monthly Income', 30, 275000),
      makeTxn('100000007', 'withdraw', 20000, 'NXB1234567890', 'Utility Bills', 32, 95000),
      makeTxn('100000008', 'deposit', 200000, 'NXB5555666677', 'Business Revenue', 35, 1300000),
      makeTxn('100000009', 'transfer', 50000, 'NXB9876543210', 'Office Rent', 38, 330000, 'NXB5555666677'),
      makeTxn('100000010', 'deposit', 30000, 'NXB1234567890', 'Freelance Payment', 45, 65000),
      makeTxn('100000011', 'withdraw', 12000, 'NXB5555666677', 'Operating Cost', 48, 1500000),
      makeTxn('100000012', 'deposit', 60000, 'NXB9876543210', 'Quarterly Bonus', 60, 215000),
      makeTxn('100000013', 'withdraw', 8000, 'NXB1234567890', 'Food & Grocery', 62, 95000),
      makeTxn('100000014', 'deposit', 150000, 'NXB5555666677', 'Project Advance', 65, 1350000),
      makeTxn('100000015', 'transfer', 30000, 'NXB1234567890', 'Family Support', 68, 87000, 'NXB1111222233'),
      makeTxn('100000016', 'deposit', 45000, 'NXB1234567890', 'Rental Income', 75, 57000),
      makeTxn('100000017', 'withdraw', 25000, 'NXB9876543210', 'Medical Expense', 80, 275000),
      makeTxn('100000018', 'deposit', 500000, 'NXB5555666677', 'Export Revenue', 88, 1000000),
      makeTxn('100000019', 'transfer', 100000, 'NXB5555666677', 'Dividend Payment', 92, 1500000, 'NXB9876543210'),
      makeTxn('100000020', 'deposit', 35000, 'NXB9876543210', 'Interest Credit', 95, 250000),
      // 4 months ago
      makeTxn('100000021', 'deposit', 90000, 'NXB1234567890', 'Bonus Payment', 110, 50000),
      makeTxn('100000022', 'withdraw', 18000, 'NXB7777888899', 'Cheque Encashment', 112, 298000),
      makeTxn('100000023', 'deposit', 300000, 'NXB5555666677', 'Contract Payment', 115, 700000),
      makeTxn('100000024', 'transfer', 40000, 'NXB9876543210', 'Supplier Payment', 118, 285000, 'NXB5555666677'),
      // 5 months ago
      makeTxn('100000025', 'deposit', 55000, 'NXB7777888899', 'Commission', 140, 243000),
      makeTxn('100000026', 'withdraw', 30000, 'NXB5555666677', 'Tax Payment', 143, 1400000),
      makeTxn('100000027', 'deposit', 120000, 'NXB9876543210', 'Annual Dividend', 148, 180000),
      makeTxn('100000028', 'transfer', 15000, 'NXB1234567890', 'Tuition Fee', 150, 65000, 'NXB1111222233'),
      // 6 months ago
      makeTxn('100000029', 'deposit', 200000, 'NXB5555666677', 'Q1 Revenue', 170, 800000),
      makeTxn('100000030', 'withdraw', 45000, 'NXB7777888899', 'Maintenance', 172, 280000),
      makeTxn('100000031', 'deposit', 70000, 'NXB1234567890', 'Consulting Fee', 175, 35000),
      makeTxn('100000032', 'transfer', 80000, 'NXB5555666677', 'Staff Salary', 178, 1000000, 'NXB9876543210'),
    ];
    saveTransactions(sampleTxns);
  }
}

// ─── Analytics Helpers ─────────────────────────────────────────
export function getMonthlyStats() {
  const transactions = getTransactions();
  const months: Record<string, { deposits: number; withdrawals: number; transfers: number }> = {};

  transactions.forEach(txn => {
    const d = new Date(txn.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { deposits: 0, withdrawals: 0, transfers: 0 };
    if (txn.type === 'deposit') months[key].deposits += txn.amount;
    else if (txn.type === 'withdraw') months[key].withdrawals += txn.amount;
    else if (txn.type === 'transfer') months[key].transfers += txn.amount;
  });

  // Last 6 months
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
    result.push({ label, ...(months[key] || { deposits: 0, withdrawals: 0, transfers: 0 }) });
  }
  return result;
}

// ─── CSV Export ───────────────────────────────────────────────
export function exportTransactionsCSV(transactions: Transaction[]): void {
  const headers = ['Transaction ID', 'Type', 'Amount (PKR)', 'Account', 'From', 'To', 'Description', 'Status', 'Date & Time'];
  const rows = transactions.map(t => [
    t.transactionId, t.type.toUpperCase(), t.amount.toFixed(2),
    t.accountNumber, t.fromAccount || '-', t.toAccount || '-',
    t.description, t.status, formatDateTime(t.createdAt),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexabank_transactions_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAccountsCSV(accounts: Account[]): void {
  const headers = ['Account No', 'Full Name', 'CNIC', 'Phone', 'Email', 'Type', 'Status', 'Balance (PKR)', 'Created'];
  const rows = accounts.map(a => [
    a.accountNumber, a.fullName, a.cnic, a.phone, a.email,
    a.accountType, a.status, a.balance.toFixed(2), formatDate(a.createdAt),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexabank_accounts_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
