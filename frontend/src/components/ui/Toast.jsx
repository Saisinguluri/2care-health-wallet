import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

export default function Toast({ message, type = 'info', onClose }) {
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-elevated ${styles[type]}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const show = (message, type = 'info') => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    // Simple imperative toast via custom event
    window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
  };
  return { showSuccess: (m) => show(m, 'success'), showError: (m) => show(m, 'error'), showInfo: (m) => show(m, 'info') };
}
