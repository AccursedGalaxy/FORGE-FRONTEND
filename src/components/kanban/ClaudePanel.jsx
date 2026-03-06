import { useRef, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";

export function ClaudePanel({ card }) {
  const { claudeState } = useApp();
  const state = claudeState[card.id] ?? {
    status: card.claudeStatus ?? null,
    chunks: [],
    sessionId: card.claudeSessionId ?? null,
  };

  const outputRef = useRef(null);
  const prevStatusRef = useRef(state.status);
  const [pending, setPending] = useState(false);
  const [resumePrompt, setResumePrompt] = useState("");

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [state.chunks]);

  // Clear pending once SSE confirms claude started or errored
  useEffect(() => {
    if (pending && state.status !== prevStatusRef.current) {
      setPending(false); // eslint-disable-line react-hooks/set-state-in-effect
    }
    prevStatusRef.current = state.status;
  }, [state.status, pending]);

  async function handleTrigger() {
    setPending(true);
    const res = await fetch(`/api/cards/${card.id}/claude/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) setPending(false);
  }

  async function handleAbort() {
    await fetch(`/api/cards/${card.id}/claude/abort`, { method: "POST" });
  }

  async function handleResume() {
    if (!resumePrompt.trim()) return;
    setPending(true);
    const res = await fetch(`/api/cards/${card.id}/claude/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: resumePrompt }),
    });
    if (!res.ok) {
      setPending(false);
    } else {
      setResumePrompt("");
    }
  }

  const isRunning = state.status === "running";
  const output = state.chunks.join("");

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8,
        padding: 14,
        marginTop: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: output ? 10 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Claude Code
          </span>
          {(state.status || pending) && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 4,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                background:
                  pending
                    ? "rgba(255,255,255,0.07)"
                    : state.status === "running"
                    ? "rgba(99,102,241,0.15)"
                    : state.status === "done"
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(239,68,68,0.15)",
                color:
                  pending
                    ? "rgba(255,255,255,0.3)"
                    : state.status === "running"
                    ? "#818cf8"
                    : state.status === "done"
                    ? "#34d399"
                    : "#f87171",
              }}
            >
              {pending ? "starting…" : state.status}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {isRunning ? (
            <button onClick={handleAbort} style={abortBtn}>
              Abort
            </button>
          ) : (
            <button
              onClick={handleTrigger}
              disabled={pending}
              style={{
                ...triggerBtn,
                opacity: pending ? 0.6 : 1,
                cursor: pending ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {pending && <Spinner />}
              {state.status === "done" || state.status === "error" ? "Re-run" : "Run"}
            </button>
          )}
        </div>
      </div>

      {/* Output */}
      {output && (
        <div
          ref={outputRef}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            lineHeight: 1.6,
            maxHeight: 420,
            overflowY: "auto",
            background: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 6,
            padding: "8px 10px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            marginTop: 10,
          }}
        >
          <StyledOutput text={output} />
          {isRunning && (
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 12,
                background: "#818cf8",
                marginLeft: 2,
                animation: "blink 1s step-end infinite",
                verticalAlign: "text-bottom",
              }}
            />
          )}
        </div>
      )}

      {/* Resume input — shown when done/error and a session exists */}
      {!isRunning && !pending && state.sessionId && (
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <input
            value={resumePrompt}
            onChange={(e) => setResumePrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleResume()}
            placeholder="Follow-up prompt…"
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              padding: "6px 10px",
              color: "rgba(255,255,255,0.7)",
              fontSize: 12,
              fontFamily: "'DM Mono', monospace",
              outline: "none",
            }}
          />
          <button
            onClick={handleResume}
            disabled={pending}
            style={{
              ...triggerBtn,
              opacity: pending ? 0.6 : 1,
              cursor: pending ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {pending && <Spinner />}
            Resume
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Splits the raw stream text into segments and applies distinct styles:
 *  - "💭 …\n\n"  → thinking block  (dim, italic)
 *  - "⚡ …\n"    → tool call line  (indigo, bold)
 *  - everything else → normal response text
 */
function StyledOutput({ text }) {
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
      // Thinking block — ends at the double newline appended in runner.ts
      const end = remaining.indexOf("\n\n", first + 2);
      if (end === -1) {
        segments.push({ kind: "think", content: remaining.slice(first) });
        remaining = "";
      } else {
        segments.push({ kind: "think", content: remaining.slice(first, end + 2) });
        remaining = remaining.slice(end + 2);
      }
    } else {
      // Single-line marker (⚡ tool or ⚠ warn) — ends at \n
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

  // Collapse consecutive identical tool segments into one with a count
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

function Spinner() {
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

const triggerBtn = {
  background: "#6366f1",
  border: "none",
  borderRadius: 6,
  padding: "5px 12px",
  cursor: "pointer",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
};

const abortBtn = {
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 6,
  padding: "5px 12px",
  cursor: "pointer",
  color: "#f87171",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
};
