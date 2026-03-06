import { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { useApp } from "../../context/AppContext";
import { useToast } from "../Toast";

export function DocsModal({ projectId, project, onClose }) {
  const { getProjectDocs, saveProjectDocs } = useApp();
  const { showError, showInfo } = useToast();

  const [tab, setTab] = useState("readme");
  const [readme, setReadme] = useState("");
  const [spec, setSpec] = useState("");
  const [readmeFromDisk, setReadmeFromDisk] = useState(false);
  const [specFromDisk, setSpecFromDisk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProjectDocs(projectId).then((data) => {
      if (data) {
        setReadme(data.readme ?? "");
        setSpec(data.spec ?? "");
        setReadmeFromDisk(data.readmeFromDisk ?? false);
        setSpecFromDisk(data.specFromDisk ?? false);
      }
      setLoading(false);
    });
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true);
    const result = await saveProjectDocs(projectId, { readme, spec });
    setSaving(false);
    if (result) {
      showInfo("Docs saved.");
      onClose();
    }
  }

  const tabStyle = (active) => ({
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
    padding: "8px 16px",
    cursor: "pointer",
    color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    transition: "all 0.15s",
  });

  const pillStyle = (fromDisk) => ({
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "2px 7px",
    borderRadius: 20,
    marginLeft: 8,
    background: fromDisk ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
    color: fromDisk ? "#10b981" : "rgba(255,255,255,0.3)",
    border: fromDisk ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.1)",
  });

  return (
    <Modal onClose={onClose} width={760}>
      <div style={{ display: "flex", flexDirection: "column", height: 560 }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "'Syne', sans-serif" }}>
              Project Docs
            </span>
            <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {project?.name}
            </span>
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            <button style={tabStyle(tab === "readme")} onClick={() => setTab("readme")}>
              README
              <span style={pillStyle(readmeFromDisk)}>{readmeFromDisk ? "disk" : "db"}</span>
            </button>
            <button style={tabStyle(tab === "spec")} onClick={() => setTab("spec")}>
              SPEC
              <span style={pillStyle(specFromDisk)}>{specFromDisk ? "disk" : "db"}</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "hidden", padding: "16px 24px" }}>
          {loading ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, paddingTop: 20 }}>Loading…</div>
          ) : (
            <textarea
              value={tab === "readme" ? readme : spec}
              onChange={(e) => tab === "readme" ? setReadme(e.target.value) : setSpec(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                height: "100%",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "12px 14px",
                color: "rgba(255,255,255,0.85)",
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
                lineHeight: 1.7,
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder={tab === "readme" ? "# Project README\n\nDescribe the project…" : "# SPEC\n\nDescribe the technical specification…"}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {project?.projectPath && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.projectPath}
            </span>
          )}
          {!project?.projectPath && <div style={{ flex: 1 }} />}
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "6px 16px",
              cursor: "pointer",
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              background: saving ? "rgba(99,102,241,0.5)" : "#6366f1",
              border: "none",
              borderRadius: 8,
              padding: "6px 20px",
              cursor: saving ? "default" : "pointer",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {saving ? "Saving…" : project?.projectPath ? "Save to disk" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
