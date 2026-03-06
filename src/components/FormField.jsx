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

export function Select({ style, children, ...props }) {
  return (
    <select
      style={{ ...inputBase, cursor: "pointer", ...style }}
      {...props}
    >
      {children}
    </select>
  );
}
