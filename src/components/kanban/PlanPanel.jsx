import { useRef, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { StyledOutput, Spinner } from "./ClaudeOutput";

export function PlanPanel({ card, onViewPlan }) {
  const { planState } = useApp();
  const state = planState[card.id] ?? {
    status: card.planStatus ?? null,
    chunks: [],
    sessionId: card.planSessionId ?? null,
  };

  const outputRef = useRef(null);
  const prevStatusRef = useRef(state.status);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [state.chunks]);

  useEffect(() => {
    if (pending && state.status !== prevStatusRef.current) {
      setPending(false); // eslint-disable-line react-hooks/set-state-in-effect
    }
    prevStatusRef.current = state.status;
  }, [state.status, pending]);

  async function handlePlan() {
    setPending(true);
    const res = await fetch(`/api/cards/${card.id}/plan/trigger`, { method: "POST" });
    if (!res.ok) setPending(false);
  }

  async function handleAbort() {
    await fetch(`/api/cards/${card.id}/plan/abort`, { method: "POST" });
  }

  const isRunning = state.status === "running";
  const liveOutput = state.chunks.join("");
  const hasPlan = card.planContent || liveOutput;

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
          marginBottom: liveOutput ? 10 : 0,
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
            Claude Planning
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
                    ? "rgba(16,185,129,0.12)"
                    : state.status === "done"
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(239,68,68,0.15)",
                color:
                  pending
                    ? "rgba(255,255,255,0.3)"
                    : state.status === "running"
                    ? "#34d399"
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
          {hasPlan && !isRunning && (
            <button onClick={onViewPlan} style={viewBtn}>
              View Plan
            </button>
          )}
          {isRunning ? (
            <button onClick={handleAbort} style={abortBtn}>
              Abort
            </button>
          ) : (
            <button
              onClick={handlePlan}
              disabled={pending}
              style={{
                ...planBtn,
                opacity: pending ? 0.6 : 1,
                cursor: pending ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {pending && <Spinner />}
              {state.status === "done" || state.status === "error" ? "Re-plan" : "Plan"}
            </button>
          )}
        </div>
      </div>

      {/* Live stream output while planning */}
      {liveOutput && (
        <div
          ref={outputRef}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            lineHeight: 1.6,
            maxHeight: 200,
            overflowY: "auto",
            background: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 6,
            padding: "8px 10px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <StyledOutput text={liveOutput} />
          {isRunning && (
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
          )}
        </div>
      )}
    </div>
  );
}

const planBtn = {
  background: "rgba(16,185,129,0.15)",
  border: "1px solid rgba(16,185,129,0.3)",
  borderRadius: 6,
  padding: "5px 12px",
  cursor: "pointer",
  color: "#34d399",
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

const viewBtn = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  padding: "5px 12px",
  cursor: "pointer",
  color: "rgba(255,255,255,0.6)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
};
