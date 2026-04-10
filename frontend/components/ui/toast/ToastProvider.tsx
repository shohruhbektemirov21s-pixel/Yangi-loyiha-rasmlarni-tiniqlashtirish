"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { cn } from "@/lib/cn";

type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastMessage = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const entry: ToastMessage = {
        id,
        title: toast.title,
        description: toast.description,
        variant: toast.variant ?? "info",
        durationMs: toast.durationMs ?? 4200
      };

      setToasts((prev) => [...prev, entry]);

      const timer = setTimeout(() => {
        removeToast(id);
      }, entry.durationMs);

      timeoutRefs.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    const timers = timeoutRefs.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast,
      success: (title, description) => pushToast({ title, description, variant: "success" }),
      error: (title, description) => pushToast({ title, description, variant: "error" }),
      info: (title, description) => pushToast({ title, description, variant: "info" })
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4 sm:justify-end sm:px-6">
        <div className="w-full max-w-sm space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto rounded-2xl border bg-white/95 p-4 shadow-card backdrop-blur transition",
                toast.variant === "success" && "border-brand-200",
                toast.variant === "error" && "border-red-200",
                toast.variant === "info" && "border-slate-200"
              )}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      toast.variant === "success" && "text-brand-700",
                      toast.variant === "error" && "text-red-700",
                      toast.variant === "info" && "text-slate-800"
                    )}
                  >
                    {toast.title}
                  </p>
                  {toast.description ? <p className="mt-1 text-sm text-slate-600">{toast.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Dismiss notification"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6 18 18" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
