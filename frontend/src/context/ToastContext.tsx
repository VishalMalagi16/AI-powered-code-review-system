import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: { type: ToastType; title?: string; message: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: { type: ToastType; title?: string; message: string; duration?: number }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => addToast({ type: 'success', title, message }), [addToast]);
  const error = useCallback((message: string, title?: string) => addToast({ type: 'error', title, message, duration: 6000 }), [addToast]);
  const warning = useCallback((message: string, title?: string) => addToast({ type: 'warning', title, message }), [addToast]);
  const info = useCallback((message: string, title?: string) => addToast({ type: 'info', title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      {/* Toast Notification Container - Anchored strictly to top-right boundary, never covering inputs */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              t.type === 'success'
                ? 'bg-[#0f291e]/95 border-emerald-500/40 text-emerald-200'
                : t.type === 'error'
                ? 'bg-[#2d1214]/95 border-red-500/40 text-red-200'
                : t.type === 'warning'
                ? 'bg-[#2b1e0d]/95 border-amber-500/40 text-amber-200'
                : 'bg-[#101b2b]/95 border-cyan-500/40 text-cyan-200'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
              {t.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0">
              {t.title && <div className="text-sm font-semibold mb-0.5">{t.title}</div>}
              <div className="text-xs opacity-90 leading-relaxed break-words">{t.message}</div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
