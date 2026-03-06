export function Avatar({ initials, size = 28, color }) {
  const hue = initials.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color || `hsl(${hue},60%,40%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#fff",
        fontFamily: "'Syne', sans-serif",
        flexShrink: 0,
        border: "1.5px solid rgba(255,255,255,0.1)",
      }}
    >
      {initials}
    </div>
  );
}
