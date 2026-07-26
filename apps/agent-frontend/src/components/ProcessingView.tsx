import type { WorkflowEvent } from "../lib/types";

interface Props {
  events: WorkflowEvent[];
  error?: string | null;
}

const STEPS = [
  { key: "profile", label: "Menganalisis Profil", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { key: "market", label: "Mengumpulkan Data Pasar", icon: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" },
  { key: "match", label: "Menghitung Kecocokan", icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
  { key: "roadmap", label: "Menyusun Roadmap", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "quality", label: "Validasi Kualitas", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export function ProcessingView({ events, error }: Props) {
  const currentSteps = events.filter((e) => e.type === "start_step" || e.type === "finish_step");
  const hasFinished = events.some((e) => e.type === "finish");

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="relative inline-flex mb-6">
          {hasFinished ? (
            <div className="w-16 h-16 rounded-full bg-[var(--color-brand-100)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--color-brand-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--color-brand-100)] flex items-center justify-center">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-500)] animate-pulse-dot" style={{ animationDelay: "0s" }} />
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-500)] animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-500)] animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">
          {hasFinished ? "Selesai!" : "Memproses..."}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {hasFinished
            ? "Career Blueprint berhasil dibuat"
            : "AI agen sedang menganalisis profil dan data pasar"}
        </p>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const started = currentSteps.find((e) => e.step === step.key && e.type === "start_step");
          const finished = currentSteps.find((e) => e.step === step.key && e.type === "finish_step");
          const isActive = !!started && !finished;
          const isDone = !!finished;

          let stateClass = "border-[var(--color-border)] bg-[var(--color-surface)]";
          let iconClass = "text-[var(--color-text-secondary)]";
          let textClass = "text-[var(--color-text-secondary)]";

          if (isDone) {
            stateClass = "border-[var(--color-brand-200)] bg-[var(--color-brand-50)]";
            iconClass = "text-[var(--color-brand-600)]";
            textClass = "text-[var(--color-brand-800)]";
          } else if (isActive) {
            stateClass = "border-[var(--color-brand-300)] bg-[var(--color-brand-50)]";
            iconClass = "text-[var(--color-brand-600)]";
            textClass = "text-[var(--color-text-heading)]";
          }

          return (
            <div key={step.key} className={`flex items-center gap-4 rounded-[var(--radius-card)] border p-4 transition-all duration-300 ${stateClass}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${iconClass}`}>
                {isDone ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : isActive ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                  </svg>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--color-border)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium transition-colors ${textClass}`}>{step.label}</p>
              </div>
              <div className="shrink-0">
                {isDone && (
                  <span className="text-xs font-medium text-[var(--color-brand-600)]">Selesai</span>
                )}
                {isActive && (
                  <span className="animate-progress h-1.5 w-16 rounded-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
