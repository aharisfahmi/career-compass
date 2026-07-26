import { useState } from "react";

interface Props {
  onSubmit: (data: any) => void;
  cvText?: string;
  initialData?: any;
}

interface FieldDef {
  name: string; label: string; type: string; placeholder?: string; colSpan?: boolean; required?: boolean;
  min?: number; max?: number; hint?: string;
}

const FIELDS: FieldDef[] = [
  { name: "full_name", label: "Nama Lengkap", type: "text", placeholder: "Masukkan nama lengkap", colSpan: true, required: true },
  { name: "current_role", label: "Posisi Saat Ini", type: "text", placeholder: "Backend Developer" },
  { name: "years_of_experience", label: "Tahun Pengalaman", type: "number", min: 0 },
  { name: "hard_skills", label: "Hard Skills", type: "text", placeholder: "Golang, PHP, PostgreSQL, Docker", colSpan: true, hint: "Pisahkan dengan koma" },
  { name: "soft_skills", label: "Soft Skills", type: "text", placeholder: "Komunikasi, Teamwork, Problem Solving", colSpan: true, hint: "Pisahkan dengan koma" },
  { name: "education", label: "Pendidikan", type: "text", placeholder: "S1 Informatika" },
  { name: "target_roles", label: "Role Target", type: "text", placeholder: "Golang Developer, PHP Developer, Data Analyst", colSpan: true, hint: "Pisahkan dengan koma" },
  { name: "learning_hours_per_week", label: "Jam Belajar per Minggu", type: "number", min: 0, max: 80 },
  { name: "budget_idr", label: "Budget (IDR)", type: "number", min: 0, placeholder: "5000000" },
];

export function ProfileForm({ onSubmit, initialData }: Props) {
  const [form, setForm] = useState<Record<string, string | number>>({
    full_name: initialData?.full_name || "",
    current_role: initialData?.current_role || "",
    years_of_experience: Number(initialData?.years_of_experience) || 0,
    hard_skills: Array.isArray(initialData?.hard_skills) ? initialData.hard_skills.join(", ") : "",
    soft_skills: Array.isArray(initialData?.soft_skills) ? initialData.soft_skills.join(", ") : "",
    education: initialData?.education || "",
    target_roles: Array.isArray(initialData?.target_roles) ? initialData.target_roles.join(", ") : "",
    learning_hours_per_week: Number(initialData?.learning_hours_per_week) || 10,
    budget_idr: Number(initialData?.budget_idr) || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      years_of_experience: Number(form.years_of_experience),
      learning_hours_per_week: Number(form.learning_hours_per_week),
      budget_idr: Number(form.budget_idr),
      hard_skills: String(form.hard_skills).split(",").map((s) => s.trim()).filter(Boolean),
      soft_skills: String(form.soft_skills).split(",").map((s) => s.trim()).filter(Boolean),
      target_roles: String(form.target_roles).split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-[var(--color-text-heading)] mb-6">Input Profil</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          {FIELDS.map((f) => {
            const id = `field-${f.name}`;
            return (
              <div key={f.name} className={f.colSpan ? "sm:col-span-2" : ""}>
                <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-heading)] mb-1.5">
                  {f.label}
                </label>
                <input
                  id={id}
                  name={f.name}
                  type={f.type}
                  min={f.min}
                  max={f.max}
                  value={form[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  placeholder={f.placeholder}
                  className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)] focus:border-[var(--color-brand-400)] transition-shadow"
                />
                {f.hint && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{f.hint}</p>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button type="submit" className="inline-flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-600)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] active:scale-[0.98] transition-all shadow-sm">
          Lanjutkan
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </form>
  );
}
