import { useMemo } from "react";
import type { WorkflowEvent, CareerBlueprint as BlueprintType } from "../lib/types";

interface Props {
  events: WorkflowEvent[];
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 80 ? "stroke-[var(--color-brand-500)] text-[var(--color-brand-700)]" :
                score >= 65 ? "stroke-amber-500 text-amber-700" :
                "stroke-red-400 text-red-600";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="var(--color-border-light)" strokeWidth="6" />
        <circle cx="40" cy="40" r="36" fill="none" className={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-[var(--color-text-heading)]">{score}</span>
      </div>
    </div>
  );
}

function Badge({ label, match }: { label: string; match: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
      match
        ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)]"
        : "bg-red-50 text-red-700 border border-red-200"
    }`}>
      {match ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {label}
    </span>
  );
}

export function CareerBlueprint({ events }: Props) {
  const finishEvent = useMemo(() => events.find((e) => e.type === "finish"), [events]);
  const blueprint = finishEvent ? (finishEvent as any).blueprint as BlueprintType : null;

  if (!blueprint) return null;

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--color-brand-100)] flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[var(--color-brand-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">Career Blueprint</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Hasil analisis karier berdasarkan profil dan data pasar</p>
      </div>

      {blueprint.profile_summary && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--color-brand-100)] flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-[var(--color-brand-700)]">
              {blueprint.profile_summary.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-heading)]">{blueprint.profile_summary.full_name}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{blueprint.profile_summary.current_role} &middot; {blueprint.profile_summary.years_of_experience} tahun pengalaman</p>
          </div>
          <div className="ml-auto">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              blueprint.confidence_level === "HIGH" ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]" :
              blueprint.confidence_level === "MEDIUM" ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                blueprint.confidence_level === "HIGH" ? "bg-[var(--color-brand-500)]" :
                blueprint.confidence_level === "MEDIUM" ? "bg-amber-500" :
                "bg-red-500"
              }`} />
              {blueprint.confidence_level}
            </span>
          </div>
        </div>
      )}

      {/* Score Cards */}
      <div className="grid gap-5">
        {(blueprint.top_paths || []).map((path, i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 animate-slide-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start gap-5">
              <ScoreCircle score={path.total_score} />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">{path.role_name}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-xs text-[var(--color-text-secondary)]">{path.confidence_level}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">&middot;</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{path.evidence_job_ids.length} lowongan terkait</span>
                </div>

                <details className="mt-3 group">
                  <summary className="text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-heading)] transition-colors list-none flex items-center gap-1">
                    Detail Skor
                    <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {Object.entries(path.score_breakdown || {}).map(([key, val]) => (
                      <div key={key} className="text-center p-2 rounded-lg bg-[var(--color-surface-secondary)]">
                        <p className="text-xs text-[var(--color-text-secondary)] capitalize">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm font-semibold text-[var(--color-text-heading)] mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                </details>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Skill Cocok ({path.matching_skills?.length || 0})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(path.matching_skills || []).map((s) => (
                        <Badge key={s} label={s} match />
                      ))}
                      {(!path.matching_skills || path.matching_skills.length === 0) && (
                        <span className="text-xs text-[var(--color-text-secondary)] italic">Tidak ada</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Skill Kurang ({path.missing_critical_skills?.length || 0})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(path.missing_critical_skills || []).map((s) => (
                        <Badge key={s} label={s} match={false} />
                      ))}
                      {(!path.missing_critical_skills || path.missing_critical_skills.length === 0) && (
                        <span className="text-xs text-[var(--color-text-secondary)] italic">Tidak ada</span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] mt-3 italic">{path.reasoning_summary}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skill Gap Matrix */}
      {blueprint.skill_gap_matrix && blueprint.skill_gap_matrix.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="text-base font-semibold text-[var(--color-text-heading)] mb-4">Skill Gap Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-light)]">
                  <th className="text-left py-3 px-3 font-medium text-[var(--color-text-secondary)]">Role</th>
                  <th className="text-left py-3 px-3 font-medium text-[var(--color-text-secondary)]">Score</th>
                  <th className="text-left py-3 px-3 font-medium text-[var(--color-text-secondary)]">Missing Skills</th>
                </tr>
              </thead>
              <tbody>
                {blueprint.skill_gap_matrix.map((item, i) => (
                  <tr key={i} className="border-b border-[var(--color-border-light)] last:border-0">
                    <td className="py-3 px-3 font-medium text-[var(--color-text-heading)]">{item.role}</td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold ${
                        Number(item.score) >= 80 ? "text-[var(--color-brand-600)]" :
                        Number(item.score) >= 65 ? "text-amber-600" : "text-red-500"
                      }`}>{item.score}</span>
                    </td>
                    <td className="py-3 px-3 text-[var(--color-text-secondary)]">{(item.missing || []).join(", ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roadmap */}
      {blueprint.roadmap_30_60_90 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="text-base font-semibold text-[var(--color-text-heading)] mb-4">Roadmap 30/60/90 Hari</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {["phase_30_days", "phase_60_days", "phase_90_days"].map((phase, pi) => {
              const items = (blueprint.roadmap_30_60_90 as any)[phase] || [];
              const labels = ["30 Hari Pertama", "60 Hari Kedua", "90 Hari Ketiga"];
              const icons = [
                "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
                "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605",
                "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m0 0a6.023 6.023 0 01-2.77-.896",
              ];
              return (
                <div key={phase} className={`rounded-lg p-4 ${items.length > 0 ? "bg-[var(--color-surface-secondary)]" : "bg-[var(--color-surface-secondary)]/50"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-[var(--color-brand-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icons[pi]} />
                    </svg>
                    <h4 className="text-sm font-semibold text-[var(--color-text-heading)]">{labels[pi]}</h4>
                  </div>
                  {items.length > 0 ? (
                    <ul className="space-y-2">
                      {(items as any[]).map((item: any, j: number) => (
                        <li key={j} className="text-sm">
                          <span className="font-medium text-[var(--color-text-heading)]">{item.skill}</span>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{item.action}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--color-text-secondary)] italic">Fokus pada fase sebelumnya</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Limitations */}
      {blueprint.limitations && blueprint.limitations.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Keterbatasan</h3>
              <ul className="mt-2 space-y-1">
                {blueprint.limitations.map((lim, i) => (
                  <li key={i} className="text-sm text-amber-700">{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sources */}
      {blueprint.sources && blueprint.sources.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="text-base font-semibold text-[var(--color-text-heading)] mb-4">Sumber Data</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {blueprint.sources.map((src, i) => (
              <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] transition-colors no-underline"
              >
                <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span className="truncate">{src.title}</span>
                <span className="text-xs text-[var(--color-text-secondary)] shrink-0">({src.id})</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
