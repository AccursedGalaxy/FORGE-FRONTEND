import { useState, useRef, useEffect } from "react";

/** Reusable labeled form field wrapper */
export function FormField({ label, children, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputBase = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "rgba(255,255,255,0.85)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export function Input({ style, ...props }) {
  return <input style={{ ...inputBase, ...style }} {...props} />;
}

export function Textarea({ style, ...props }) {
  return (
    <textarea
      style={{ ...inputBase, resize: "vertical", minHeight: 80, lineHeight: 1.5, ...style }}
      {...props}
    />
  );
}

export function Select({ style, value, onChange, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const options = (Array.isArray(children) ? children : [children])
    .filter(Boolean)
    .map((c) => ({ value: c.props.value, label: c.props.children }));

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", ...style }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...inputBase,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{selectedLabel}</span>
        <span style={{ opacity: 0.4, fontSize: 9, marginLeft: 6 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#1a1b24",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setOpen(false);
              }}
              style={{
                padding: "9px 12px",
                fontSize: 13,
                color: opt.value === value ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
                background: opt.value === value ? "rgba(99,102,241,0.12)" : "transparent",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
