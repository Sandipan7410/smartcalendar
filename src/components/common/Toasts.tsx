import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';

export const Toasts: React.FC = () => {
  const { toasts, dismissToast } = useCalendar();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-xs text-gray-900 dark:text-white leading-tight">
              {toast.title}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{toast.message}</p>
          </div>

          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
