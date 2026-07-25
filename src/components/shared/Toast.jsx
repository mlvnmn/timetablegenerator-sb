import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={16} className="text-emerald-600" />,
  error:   <AlertTriangle size={16} className="text-red-600" />,
  info:    <Info size={16} className="text-blue-600" />,
};

const STYLE = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
};

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`
      flex items-center gap-3 px-4 py-3 rounded-xl border shadow-md animate-slide-up font-semibold text-xs
      ${STYLE[type]}
    `}>
      {ICONS[type]}
      <span className="flex-1 leading-tight">{message}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-700 ml-2 transition-colors">
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
