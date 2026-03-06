import { useEffect } from "react";

/**
 * Generic modal shell.
 * Usage: <Modal onClose={fn} title="..." width={480}> ...content </Modal>
 */
export function Modal({ onClose, title, children, width = 480, zIndex = 1000 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex,
        backdropFilter: "blur(8px)",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: "100%",
          background: "#0e0f14",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          {title && (
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.3)",
              fontSize: 22,
              lineHeight: 1,
              padding: 0,
              marginLeft: "auto",
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
