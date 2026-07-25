import { useMemo } from "react";
import type { WorkflowEvent, CareerBlueprint as BlueprintType } from "../lib/types";

interface Props {
  events: WorkflowEvent[];
}

export function CareerBlueprint({ events }: Props) {
  const blueprint = useMemo(() => {
    const finish = events.find((e) => e.type === "finish");
    if (!finish) return null;
    return (finish as any).blueprint as BlueprintType | null;
  }, [events]);

  if (!blueprint) return <p>Menunggu hasil...</p>;

  return (
    <div>
      <h2>Career Blueprint</h2>

      {blueprint.top_paths?.map((path, i) => (
        <div key={i} style={cardStyle}>
          <h3>{path.role_name}</h3>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: path.total_score >= 80 ? "green" : path.total_score >= 65 ? "orange" : "red" }}>
            {path.total_score}/100
          </div>
          <p>Confidence: {path.confidence_level}</p>
          <details>
            <summary>Detail Skor</summary>
            {Object.entries(path.score_breakdown || {}).map(([key, val]) => (
              <div key={key}>{key}: {val}</div>
            ))}
          </details>
          <h4>Skill Cocok</h4>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {(path.matching_skills || []).map((s) => (
              <span key={s} style={badgeStyle(true)}>{s}</span>
            ))}
          </div>
          <h4>Skill Kurang</h4>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {(path.missing_critical_skills || []).map((s) => (
              <span key={s} style={badgeStyle(false)}>{s}</span>
            ))}
          </div>
          <p style={{ fontStyle: "italic", marginTop: "8px" }}>{path.reasoning_summary}</p>
        </div>
      ))}

      {blueprint.skill_gap_matrix && blueprint.skill_gap_matrix.length > 0 && (
        <div style={cardStyle}>
          <h3>Skill Gap Matrix</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}>Role</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}>Score</th>
                <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}>Missing Skills</th>
              </tr>
            </thead>
            <tbody>
              {blueprint.skill_gap_matrix.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{item.role}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{item.score}</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{(item.missing || []).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {blueprint.roadmap_30_60_90?.phase_30_days && (
        <div style={cardStyle}>
          <h3>Roadmap 30/60/90 Hari</h3>
          <h4>30 Hari Pertama</h4>
          <ul>
            {(blueprint.roadmap_30_60_90.phase_30_days as any[])?.map((item, i) => (
              <li key={i}><strong>{item.skill}</strong>: {item.action}</li>
            ))}
          </ul>
        </div>
      )}

      {blueprint.limitations && blueprint.limitations.length > 0 && (
        <div style={cardStyle}>
          <h3>Keterbatasan</h3>
          <ul>
            {blueprint.limitations.map((lim, i) => (
              <li key={i} style={{ color: "red" }}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {blueprint.sources && blueprint.sources.length > 0 && (
        <div style={cardStyle}>
          <h3>Sumber Data</h3>
          <ul>
            {blueprint.sources.map((src, i) => (
              <li key={i}>
                <a href={src.url} target="_blank" rel="noopener noreferrer">{src.title}</a>
                {" "}({src.id})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#f9f9f9",
  padding: "16px",
  borderRadius: "8px",
  marginBottom: "16px",
  border: "1px solid #eee",
};

const badgeStyle = (isMatch: boolean): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "12px",
  background: isMatch ? "#d4edda" : "#f8d7da",
  color: isMatch ? "#155724" : "#721c24",
  margin: "2px",
});
