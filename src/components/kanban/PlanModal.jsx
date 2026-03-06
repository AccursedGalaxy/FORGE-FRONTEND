import { useState, useRef, useEffect } from "react";
import { Modal } from "../Modal";
import { SimpleMarkdown } from "./MarkdownRenderer";
import { StyledOutput } from "./ClaudeOutput";
import { useApp } from "../../context/AppContext";

export function PlanModal({ card, onClose }) {
  const { planState } = useApp();
  const state = planState[card.id] ?? { status: card.planStatus ?? null, chunks: [], sessionId: null };

  const [feedbackText, setFeedbackText] = useState("");
  const [pending, setPending] = useState(false);
  const contentRef = useRef(null);

  const liveChunks = state.chunks.join("");
  const baseContent = card.planContent ?? "";

  const isRunning = state.status === "running";
  const hasPlan = !!(baseContent.trim() || liveChunks.trim());

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (contentRef.current && isRunning) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [liveChunks, isRunning]);

  async function handleFeedback() {
    if (!feedbackText.trim() || pending) return;
    setPending(true);
    const res = await fetch(`/api/cards/${card.id}/plan/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: feedbackText }),
    });
    if (res.ok) setFeedbackText("");
    setPending(false);
  }

  return (
    <Modal onClose={onClose} title="Implementation Plan" width={860} zIndex={1100}>
      {/* Plan content */}
      <div
        ref={contentRef}
        style={{
          background: "rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 16,
          maxHeight: "58vh",
          overflowY: "auto",
        }}
      >
        {baseContent ? (
          <SimpleMarkdown text={baseContent} />
        ) : !isRunning ? (
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
            No plan content yet.
          </p>
        ) : null}

        {/* Live follow-up activity — only shown while streaming */}
        {isRunning && liveChunks && (
          <div style={{ borderTop: "1px solid rgba(52,211,153,0.15)", marginTop: 16, paddingTop: 12 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "rgba(52,211,153,0.4)", margin: "0 0 8px",
            }}>
              Updating plan…
            </p>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11, lineHeight: 1.6,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              <StyledOutput text={liveChunks} />
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 12,
                  background: "#34d399",
                  marginLeft: 2,
                  animation: "blink 1s step-end infinite",
                  verticalAlign: "text-bottom",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Feedback section — always shown when plan exists and not running */}
      {hasPlan && !isRunning && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 14,
          }}
        >
          <p style={{
            margin: "0 0 8px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.25)",
          }}>
            Request changes
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleFeedback();
              }}
              placeholder="e.g. Add error handling steps, break step 3 into smaller tasks… (Ctrl+Enter to send)"
              rows={2}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                padding: "8px 10px",
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                resize: "vertical",
              }}
            />
            <button
              onClick={handleFeedback}
              disabled={pending || !feedbackText.trim()}
              style={{
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 6,
                padding: "8px 16px",
                cursor: pending || !feedbackText.trim() ? "default" : "pointer",
                color: "#34d399",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
                opacity: pending || !feedbackText.trim() ? 0.4 : 1,
                alignSelf: "flex-end",
                whiteSpace: "nowrap",
              }}
            >
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {isRunning && !liveChunks && (
        <p style={{
          margin: "12px 0 0",
          fontSize: 11,
          color: "rgba(52,211,153,0.4)",
          fontFamily: "'DM Mono', monospace",
        }}>
          Planning in progress…
        </p>
      )}
    </Modal>
  );
}
