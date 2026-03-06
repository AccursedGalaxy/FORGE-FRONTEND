import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let _nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const showError = useCallback((msg) => addToast(msg, "error"), [addToast]);
  const showInfo  = useCallback((msg) => addToast(msg, "info"),  [addToast]);

  return (
    <ToastContext.Provider value={{ showError, showInfo }}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                background:
                  t.type === "error"
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(99,102,241,0.15)",
                border: `1px solid ${
                  t.type === "error"
                    ? "rgba(239,68,68,0.4)"
                    : "rgba(99,102,241,0.4)"
                }`,
                borderRadius: 10,
                padding: "10px 16px",
                color: t.type === "error" ? "#fca5a5" : "#a5b4fc",
                fontSize: 13,
                fontWeight: 500,
                maxWidth: 340,
                backdropFilter: "blur(12px)",
                lineHeight: 1.4,
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
