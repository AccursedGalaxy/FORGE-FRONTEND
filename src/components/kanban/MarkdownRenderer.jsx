/**
 * SimpleMarkdown renders a subset of markdown: **bold**, *italic*, `code`,
 * bullet lists, headers (## / ###), and paragraph breaks.
 */
export function SimpleMarkdown({ text }) {
  const paragraphs = text.split(/\n{2,}/);

  return (
    <div style={{ margin: 0 }}>
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n");

        // Heading: ## or ###
        const firstLine = lines[0]?.trim() ?? "";
        if (firstLine.startsWith("## ") || firstLine.startsWith("### ")) {
          const level = firstLine.startsWith("### ") ? 3 : 2;
          const headingText = firstLine.replace(/^#{2,3} /, "");
          return (
            <div key={pi} style={{ marginTop: pi === 0 ? 0 : 16 }}>
              <p style={{
                margin: "0 0 6px",
                fontSize: level === 2 ? 13 : 12,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                fontFamily: "'Syne', sans-serif",
              }}>
                <InlineMarkdown text={headingText} />
              </p>
              {lines.slice(1).length > 0 && (
                <SimpleMarkdown text={lines.slice(1).join("\n")} />
              )}
            </div>
          );
        }

        const isList = lines.every((l) => l.trimStart().startsWith("- ") || l.trim() === "");
        if (isList) {
          return (
            <ul key={pi} style={{ margin: pi === 0 ? 0 : "8px 0 0", paddingLeft: 16 }}>
              {lines.filter((l) => l.trim()).map((line, li) => (
                <li key={li} style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 2 }}>
                  <InlineMarkdown text={line.replace(/^[\s-]+/, "")} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={pi} style={{ margin: pi === 0 ? 0 : "8px 0 0", fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
            {lines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                <InlineMarkdown text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function InlineMarkdown({ text }) {
  const tokens = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ kind: "text", content: text.slice(last, m.index) });
    if (m[0].startsWith("**"))    tokens.push({ kind: "bold",   content: m[2] });
    else if (m[0].startsWith("*")) tokens.push({ kind: "italic", content: m[3] });
    else                           tokens.push({ kind: "code",   content: m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ kind: "text", content: text.slice(last) });

  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === "bold")   return <strong key={i} style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{t.content}</strong>;
        if (t.kind === "italic") return <em key={i} style={{ color: "rgba(255,255,255,0.55)" }}>{t.content}</em>;
        if (t.kind === "code")   return <code key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: 3 }}>{t.content}</code>;
        return <span key={i}>{t.content}</span>;
      })}
    </>
  );
}
