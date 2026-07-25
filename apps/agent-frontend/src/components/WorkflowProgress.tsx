import type { WorkflowEvent } from "../lib/types";

interface Props {
  events: WorkflowEvent[];
}

const STEP_LABELS: Record<string, string> = {
  profile: "Menganalisis Profil",
  market: "Mengumpulkan Data Pasar",
  match: "Menghitung Kecocokan",
  roadmap: "Menyusun Roadmap",
  quality: "Validasi Kualitas",
};

export function WorkflowProgress({ events }: Props) {
  const currentSteps = events.filter((e) => e.type === "start_step" || e.type === "finish_step");

  return (
    <div>
      <h3>Progress</h3>
      {Object.entries(STEP_LABELS).map(([key, label]) => {
        const started = currentSteps.find((e) => e.step === key && e.type === "start_step");
        const finished = currentSteps.find((e) => e.step === key && e.type === "finish_step");
        const isActive = started && !finished;
        const isDone = !!finished;

        return (
          <div key={key} style={{
            padding: "8px 12px",
            margin: "4px 0",
            background: isDone ? "#d4edda" : isActive ? "#cce5ff" : "#f8f9fa",
            borderRadius: "6px",
            fontWeight: isActive ? "bold" : "normal",
          }}>
            {isDone ? "✓ " : isActive ? "→ " : "○ "}
            {label}
            {isActive && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#666" }}>processing...</span>}
          </div>
        );
      })}
    </div>
  );
}
