// ============================================================
// TypeScript Types & Interfaces for NexaBank
// ============================================================

export type AccountType = 'saving' | 'current' | 'business';
export type AccountStatus = 'active' | 'inactive' | 'frozen';
export type Gender = 'male' | 'female' | 'other';
export type TransactionType = 'deposit' | 'withdraw' | 'transfer';
export type UserRole = 'admin' | 'employee' | 'customer';
export type ThemeMode = 'light' | 'dark';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  accountId?: string; // for customer role
  name: string;
  avatar?: string;
  lastLogin?: string;
}

export interface Account {
  id: string;
  accountNumber: string;
  accountType: AccountType;
  status: AccountStatus;
  balance: number;
  // Customer Info
  fullName: string;
  cnic: string;
  phone: string;
  email: string;
  address: string;
  gender: Gender;
  dateOfBirth: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  transactionId: string;
  type: TransactionType;
  amount: number;
  fromAccount?: string;
  toAccount?: string;
  accountNumber: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  status: 'success' | 'failed' | 'pending';
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  read: boolean;
  createdAt: string;
}

export interface AppState {
  currentUser: User | null;
  theme: ThemeMode;
  activeSection: string;
  accounts: Account[];
  transactions: Transaction[];
  notifications: Notification[];
  users: User[];
}
