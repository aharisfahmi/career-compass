import { useState, useRef } from "react";

interface Props {
  onExtracted: (cvText: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export function CvUpload({ onExtracted }: Props) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setResult("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/v1/profile/upload-cv`, { method: "POST", body: formData });
      const data = await res.json();
      setResult("CV berhasil diproses");
      onExtracted(data.cv_text);
    } catch {
      setResult("Gagal memproses CV");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative rounded-[var(--radius-card)] border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
        dragOver
          ? "border-[var(--color-brand-400)] bg-[var(--color-brand-50)]/50"
          : "border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)]/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--color-brand-100)] flex items-center justify-center">
          <svg className="w-6 h-6 text-[var(--color-brand-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-[var(--color-text-heading)]">Upload CV (PDF / TXT)</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Seret file ke sini atau klik untuk memilih</p>
        </div>
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-brand-600)]">
            <div className="animate-spin w-4 h-4 border-2 border-[var(--color-brand-300)] border-t-[var(--color-brand-600)] rounded-full" />
            Memproses CV...
          </div>
        )}
        {result && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-brand-600)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
