/**
 * StyledOutput renders raw Claude stream text with visual distinctions for
 * thinking blocks (💭), tool calls (⚡), and warnings (⚠).
 */
export function StyledOutput({ text }) {
  const segments = [];
  let remaining = text;

  while (remaining.length > 0) {
    const thinkStart = remaining.indexOf("💭 ");
    const toolStart  = remaining.indexOf("\n⚡ ");
    const warnStart  = remaining.indexOf("\n⚠ ");

    const candidates = [thinkStart, toolStart, warnStart].filter((n) => n !== -1);
    const first = candidates.length === 0 ? -1 : Math.min(...candidates);

    if (first === -1) {
      segments.push({ kind: "text", content: remaining });
      break;
    }

    if (first > 0) {
      segments.push({ kind: "text", content: remaining.slice(0, first) });
    }

    if (first === thinkStart && (toolStart === -1 || thinkStart <= toolStart) && (warnStart === -1 || thinkStart <= warnStart)) {
      const end = remaining.indexOf("\n\n", first + 2);
      if (end === -1) {
        segments.push({ kind: "think", content: remaining.slice(first) });
        remaining = "";
      } else {
        segments.push({ kind: "think", content: remaining.slice(first, end + 2) });
        remaining = remaining.slice(end + 2);
      }
    } else {
      const isWarn = first === warnStart && (toolStart === -1 || warnStart <= toolStart);
      const kind = isWarn ? "warn" : "tool";
      const lineEnd = remaining.indexOf("\n", first + 2);
      if (lineEnd === -1) {
        segments.push({ kind, content: remaining.slice(first) });
        remaining = "";
      } else {
        segments.push({ kind, content: remaining.slice(first, lineEnd + 1) });
        remaining = remaining.slice(lineEnd + 1);
      }
    }
  }

  const collapsed = [];
  for (const seg of segments) {
    const prev = collapsed[collapsed.length - 1];
    if (seg.kind === "tool" && prev?.kind === "tool" && seg.content === prev.content) {
      prev.count = (prev.count ?? 1) + 1;
    } else {
      collapsed.push({ ...seg, count: 1 });
    }
  }

  return (
    <>
      {collapsed.map((seg, i) => {
        if (seg.kind === "think") return (
          <span key={i} style={{ color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>{seg.content}</span>
        );
        if (seg.kind === "tool") return (
          <span key={i} style={{ color: "#818cf8", fontWeight: 700 }}>
            {seg.content.trimEnd()}
            {seg.count > 1 && (
              <span style={{ color: "rgba(129,140,248,0.5)", fontWeight: 400 }}> ×{seg.count}</span>
            )}
            {"\n"}
          </span>
        );
        if (seg.kind === "warn") return (
          <span key={i} style={{ color: "#f87171", fontWeight: 600 }}>{seg.content}</span>
        );
        return (
          <span key={i} style={{ color: "rgba(255,255,255,0.75)" }}>{seg.content}</span>
        );
      })}
    </>
  );
}

export function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "#fff",
        animation: "spin 0.65s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}
