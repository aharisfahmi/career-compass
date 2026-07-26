interface Props {
  formData: any;
  cvText?: string;
  onConfirm: () => void;
  onBack: () => void;
}

export function ConfirmProfile({ formData, cvText, onConfirm, onBack }: Props) {
  const fields = [
    { label: "Nama Lengkap", value: formData.full_name },
    { label: "Posisi Saat Ini", value: formData.current_role || "-" },
    { label: "Pengalaman", value: `${formData.years_of_experience} tahun` },
    { label: "Hard Skills", value: formData.hard_skills?.join(", ") },
    { label: "Soft Skills", value: formData.soft_skills?.join(", ") },
    { label: "Pendidikan", value: formData.education || "-" },
    { label: "Role Target", value: formData.target_roles?.join(", ") },
    { label: "Jam Belajar", value: `${formData.learning_hours_per_week} jam/minggu` },
    { label: "Budget", value: `Rp ${Number(formData.budget_idr).toLocaleString("id-ID")}` },
  ];

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-[var(--color-brand-100)] flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[var(--color-brand-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">Konfirmasi Profil</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Pastikan data di bawah sudah benar sebelum diproses</p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border-light)] overflow-hidden">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-3.5 text-sm">
            <span className="text-[var(--color-text-secondary)]">{f.label}</span>
            <span className="font-medium text-[var(--color-text-heading)] text-right max-w-[50%] truncate">{f.value}</span>
          </div>
        ))}
      </div>

      {cvText && (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-brand-600)] justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          CV berhasil diproses
        </div>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-600)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] active:scale-[0.98] transition-all shadow-sm">
          Proses Career Blueprint
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25M12 10.5h8.25M9.75 21L21 9.75" />
          </svg>
        </button>
        <button onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-secondary)] active:scale-[0.98] transition-all">
          Edit Kembali
        </button>
      </div>
    </div>
  );
}
