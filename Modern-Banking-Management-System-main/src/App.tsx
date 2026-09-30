// ============================================================
// NexaBank — Premium Banking Management System
// Main App Entry Point
// ============================================================

import React, { useState, useEffect } from 'react';
import { AppState, ThemeMode } from './types';
import { getCurrentUser, saveCurrentUser, getTheme, saveTheme, freeStorageSpace } from './utils/storage';
import { seedDefaultData } from './utils/helpers';
import LoginPage from './components/LoginPage';
import MainLayout from './components/MainLayout';
import './styles/app.css';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    currentUser: null,
    theme: 'light',
    activeSection: 'dashboard',
    accounts: [],
    transactions: [],
    notifications: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);

  // Initialize app on mount
  useEffect(() => {
    freeStorageSpace()
    seedDefaultData()
    const user = getCurrentUser()
    if (user) saveCurrentUser(user)
    const theme = getTheme() as ThemeMode
    setAppState(prev => ({ ...prev, currentUser: user, theme }))
    document.documentElement.setAttribute('data-theme', theme)
    setLoading(false)
  }, [])

  // Handle login
  const handleLogin = (user: AppState['currentUser']) => {
    saveCurrentUser(user);
    setAppState(prev => ({ ...prev, currentUser: user, activeSection: 'dashboard' }));
  };

  // Handle logout
  const handleLogout = () => {
    saveCurrentUser(null);
    setAppState(prev => ({ ...prev, currentUser: null, activeSection: 'dashboard' }));
  };

  // Handle theme toggle
  const handleThemeToggle = () => {
    const newTheme: ThemeMode = appState.theme === 'light' ? 'dark' : 'light';
    saveTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    setAppState(prev => ({ ...prev, theme: newTheme }));
  };

  // Handle section change
  const handleSectionChange = (section: string) => {
    setAppState(prev => ({ ...prev, activeSection: section }));
  };

  if (loading) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-logo">
            <i className="bi bi-bank2"></i>
          </div>
          <h1>NexaBank</h1>
          <div className="splash-loader">
            <div className="loader-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!appState.currentUser) {
    return <LoginPage onLogin={handleLogin} theme={appState.theme} onThemeToggle={handleThemeToggle} />;
  }

  return (
    <MainLayout
      theme={appState.theme}
      onThemeToggle={handleThemeToggle}
      activeSection={appState.activeSection}
      onSectionChange={handleSectionChange}
      currentUser={appState.currentUser}
      onLogout={handleLogout}
    />
  );
};

export default App;
