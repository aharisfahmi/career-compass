import { useState } from "react";
import type { ExtractedProfile } from "../lib/types";

interface Props {
  onSubmit: (data: any) => void;
  cvText?: string;
}

export function ProfileForm({ onSubmit, cvText }: Props) {
  const [form, setForm] = useState({
    full_name: "",
    current_role: "",
    years_of_experience: 0,
    hard_skills: "",
    soft_skills: "",
    education: "",
    target_roles: "",
    learning_hours_per_week: 10,
    budget_idr: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      hard_skills: form.hard_skills.split(",").map((s) => s.trim()).filter(Boolean),
      soft_skills: form.soft_skills.split(",").map((s) => s.trim()).filter(Boolean),
      target_roles: form.target_roles.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Input Profil</h2>
      <div style={{ display: "grid", gap: "12px" }}>
        <label>
          Nama Lengkap:
          <input name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} />
        </label>
        <label>
          Posisi Saat Ini:
          <input name="current_role" value={form.current_role} onChange={handleChange} style={inputStyle} />
        </label>
        <label>
          Tahun Pengalaman:
          <input name="years_of_experience" type="number" value={form.years_of_experience} onChange={handleChange} style={inputStyle} />
        </label>
        <label>
          Hard Skills (pisahkan dengan koma):
          <input name="hard_skills" value={form.hard_skills} onChange={handleChange} placeholder="Python, SQL, React" style={inputStyle} />
        </label>
        <label>
          Soft Skills (pisahkan dengan koma):
          <input name="soft_skills" value={form.soft_skills} onChange={handleChange} placeholder="Komunikasi, Teamwork" style={inputStyle} />
        </label>
        <label>
          Pendidikan:
          <input name="education" value={form.education} onChange={handleChange} style={inputStyle} />
        </label>
        <label>
          Role Target (pisahkan dengan koma):
          <input name="target_roles" value={form.target_roles} onChange={handleChange} placeholder="Data Analyst, Business Analyst" style={inputStyle} />
        </label>
        <label>
          Jam Belajar per Minggu:
          <input name="learning_hours_per_week" type="number" value={form.learning_hours_per_week} onChange={handleChange} style={inputStyle} />
        </label>
        <label>
          Budget (IDR):
          <input name="budget_idr" type="number" value={form.budget_idr} onChange={handleChange} style={inputStyle} />
        </label>
      </div>
      <button type="submit" style={btnStyle}>Lanjutkan</button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px",
  marginTop: "4px",
  border: "1px solid #ccc",
  borderRadius: "4px",
};

const btnStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "12px 24px",
  background: "#0070f3",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
};
