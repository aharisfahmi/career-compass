import type { WorkflowEvent } from "../lib/types";

interface Props {
  events: WorkflowEvent[];
}

export function AgentTrace({ events }: Props) {
  const steps = events.filter((e) => e.type === "start_step" || e.type === "finish_step");

  return (
    <div style={{ marginTop: "24px" }}>
      <h3>Trace Agent</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Agent</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Waktu</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((e, i) => (
            <tr key={i}>
              <td style={tdStyle}>{e.label || e.step}</td>
              <td style={tdStyle}>
                {e.type === "start_step" ? (
                  <span style={{ color: "#0070f3" }}>▶ Running</span>
                ) : (
                  <span style={{ color: "green" }}>✓ Done</span>
                )}
              </td>
              <td style={tdStyle}>{new Date().toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px",
  borderBottom: "2px solid #ddd",
};

const tdStyle: React.CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid #eee",
};
