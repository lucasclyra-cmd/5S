"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let _nextId = 0;

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: { border: "var(--success)", bg: "rgba(45,138,78,0.07)", text: "var(--success)" },
  error: { border: "var(--danger)", bg: "rgba(201,69,62,0.07)", text: "var(--danger)" },
  info: { border: "var(--accent)", bg: "rgba(59,125,216,0.07)", text: "var(--accent)" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: 380,
          }}
        >
          {toasts.map((t) => {
            const Icon = ICONS[t.variant];
            const c = COLORS[t.variant];
            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  animation: "toastIn 0.2s ease",
                }}
              >
                <Icon size={16} style={{ color: c.text, marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1, lineHeight: 1.45 }}>
                  {t.message}
                </span>
                <button
                  onClick={() => dismiss(t.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: 0,
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
