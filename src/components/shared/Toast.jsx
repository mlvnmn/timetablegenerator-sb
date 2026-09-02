import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />,
  error:   <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />,
  info:    <Info size={16} className="text-blue-500 flex-shrink-0" />,
};

const STYLES = {
  success: 'bg-white/95 border-emerald-200 text-slate-800 shadow-md shadow-emerald-500/5',
  error:   'bg-white/95 border-rose-200 text-slate-800 shadow-md shadow-rose-500/5',
  info:    'bg-white/95 border-blue-200 text-slate-800 shadow-md shadow-blue-500/5',
};

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`
      flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md animate-fade-in font-bold text-xs
      ${STYLES[type] || STYLES.info}
    `}>
      {ICONS[type] || ICONS.info}
      <span className="flex-1 leading-snug text-slate-700 font-semibold">{message}</span>
      <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}
