// ============================================================
// Toast Notification Component
// ============================================================

import React, { useEffect } from 'react';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

const ICONS = {
  success: 'bi-check-circle-fill',
  error: 'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

const ToastItem: React.FC<{ toast: ToastData; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div className={`toast ${toast.type}`}>
      <i className={`bi ${ICONS[toast.type]} toast-icon`}></i>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        <i className="bi bi-x"></i>
      </button>
    </div>
  );
};

const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
  );
};

export default Toast;
