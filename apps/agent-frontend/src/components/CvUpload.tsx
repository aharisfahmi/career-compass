import { useState, useRef } from "react";

interface Props {
  onExtracted: (cvText: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function CvUpload({ onExtracted }: Props) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/profile/upload-cv`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult("CV berhasil diproses");
      onExtracted(data.cv_text);
    } catch {
      setResult("Gagal memproses CV");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload CV (PDF)</h2>
      <input ref={inputRef} type="file" accept=".pdf" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Memproses CV...</p>}
      {result && <p style={{ color: "green" }}>{result}</p>}
    </div>
  );
}
