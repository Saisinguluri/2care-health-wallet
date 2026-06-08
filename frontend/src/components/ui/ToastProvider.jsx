import { useState, useEffect } from 'react';
import Toast from './Toast';

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handler = (e) => setToast(e.detail);
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  return (
    <>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

export function toast(message, type = 'info') {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
}
