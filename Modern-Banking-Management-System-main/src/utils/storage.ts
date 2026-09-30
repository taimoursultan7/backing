// ============================================================
// LocalStorage Utility Functions
// ============================================================

import { Account, Transaction, User, Notification } from '../types'

const KEYS = {
  ACCOUNTS: 'nexabank_accounts',
  TRANSACTIONS: 'nexabank_transactions',
  USERS: 'nexabank_users',
  NOTIFICATIONS: 'nexabank_notifications',
  CURRENT_USER: 'nexabank_current_user',
  THEME: 'nexabank_theme',
  PRINT_SETTINGS: 'nexabank_print_settings',
}

export type PrintSettings = {
  bankTitle: string
  footerNote: string
}

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  bankTitle: 'NexaBank',
  footerNote: 'Thank you for banking with NexaBank. This is a computer-generated receipt.',
}

const MAX_STORED_TRANSACTIONS = 400
const MAX_INLINE_IMAGE_LENGTH = 120_000

export type StoredSession = Pick<User, 'id' | 'username' | 'role' | 'name' | 'accountId' | 'lastLogin'>

const isQuotaError = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' || error.code === 22)

const readSessionPayload = (): StoredSession | null => {
  const raw =
    sessionStorage.getItem(KEYS.CURRENT_USER) ??
    localStorage.getItem(KEYS.CURRENT_USER)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

const estimateNexabankStorageBytes = (): number => {
  let total = 0
  Object.values(KEYS).forEach(key => {
    const value = localStorage.getItem(key)
    if (value) total += value.length
  })
  return total
}

const stripAllInlineImages = (): void => {
  try {
    const accounts = getAccounts().map(({ profilePicture: _p, ...rest }) => rest as Account)
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts))
  } catch {
    /* best effort */
  }
  try {
    const users = getUsers().map(({ avatar: _a, ...rest }) => rest as User)
    localStorage.setItem(KEYS.USERS, JSON.stringify(users))
  } catch {
    /* best effort */
  }
}

/** Frees space when localStorage is full (large profile photos, unbounded history). */
export const freeStorageSpace = (): void => {
  try {
    const accounts = getAccounts().map(account => {
      if (
        account.profilePicture &&
        account.profilePicture.length > MAX_INLINE_IMAGE_LENGTH
      ) {
        const { profilePicture: _removed, ...rest } = account
        return rest as Account
      }
      return account
    })
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts))
  } catch {
    /* best effort */
  }

  try {
    const users = getUsers().map(user => {
      if (user.avatar && user.avatar.length > MAX_INLINE_IMAGE_LENGTH) {
        const { avatar: _removed, ...rest } = user
        return rest as User
      }
      return user
    })
    localStorage.setItem(KEYS.USERS, JSON.stringify(users))
  } catch {
    /* best effort */
  }

  try {
    const transactions = getTransactions().slice(0, MAX_STORED_TRANSACTIONS)
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions))
  } catch {
    /* best effort */
  }

  if (estimateNexabankStorageBytes() > 4_000_000) {
    stripAllInlineImages()
  }
}

const setRaw = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    if (!isQuotaError(error)) throw error
    freeStorageSpace()
    localStorage.setItem(key, value)
  }
}

// Generic get
function get<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// Generic set
function set<T>(key: string, data: T[]): void {
  let payload = data
  if (key === KEYS.TRANSACTIONS && data.length > MAX_STORED_TRANSACTIONS) {
    payload = data.slice(0, MAX_STORED_TRANSACTIONS) as T[]
  }
  setRaw(key, JSON.stringify(payload))
}

// Accounts
export const getAccounts = (): Account[] => get<Account>(KEYS.ACCOUNTS)
export const saveAccounts = (accounts: Account[]): void => set(KEYS.ACCOUNTS, accounts)

// Transactions
export const getTransactions = (): Transaction[] => get<Transaction>(KEYS.TRANSACTIONS)
export const saveTransactions = (transactions: Transaction[]): void =>
  set(KEYS.TRANSACTIONS, transactions)

// Users
export const getUsers = (): User[] => get<User>(KEYS.USERS)
export const saveUsers = (users: User[]): void => set(KEYS.USERS, users)

// Notifications
export const getNotifications = (): Notification[] => get<Notification>(KEYS.NOTIFICATIONS)
export const saveNotifications = (notifications: Notification[]): void =>
  set(KEYS.NOTIFICATIONS, notifications)

const toSession = (user: User): StoredSession => ({
  id: user.id,
  username: user.username,
  role: user.role,
  name: user.name,
  accountId: user.accountId,
  lastLogin: user.lastLogin,
})

// Current user: small session in sessionStorage (avoids quota errors from bloated user objects)
export const getCurrentUser = (): User | null => {
  const session = readSessionPayload()
  if (!session?.id) return null

  const users = getUsers()
  const match = users.find(u => u.id === session.id)
  if (match) {
    return { ...match, lastLogin: session.lastLogin ?? match.lastLogin }
  }

  return {
    ...session,
    password: '',
  } as User
}

export const saveCurrentUser = (user: User | null): void => {
  if (!user) {
    sessionStorage.removeItem(KEYS.CURRENT_USER)
    localStorage.removeItem(KEYS.CURRENT_USER)
    return
  }

  const payload = JSON.stringify(toSession(user))

  try {
    sessionStorage.setItem(KEYS.CURRENT_USER, payload)
    localStorage.removeItem(KEYS.CURRENT_USER)
  } catch (error) {
    if (!isQuotaError(error)) throw error
    freeStorageSpace()
    sessionStorage.setItem(KEYS.CURRENT_USER, payload)
    localStorage.removeItem(KEYS.CURRENT_USER)
  }
}

// Theme
export const getTheme = (): string => localStorage.getItem(KEYS.THEME) || 'light'
export const saveTheme = (theme: string): void => localStorage.setItem(KEYS.THEME, theme)

// Print / bill receipt header & footer (System → Settings)
export const getPrintSettings = (): PrintSettings => {
  try {
    const raw = localStorage.getItem(KEYS.PRINT_SETTINGS)
    if (!raw) return { ...DEFAULT_PRINT_SETTINGS }
    return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PRINT_SETTINGS }
  }
}

export const savePrintSettings = (settings: PrintSettings): void => {
  setRaw(KEYS.PRINT_SETTINGS, JSON.stringify(settings))
}

// Clear all data
export const clearAll = (): void => {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}
