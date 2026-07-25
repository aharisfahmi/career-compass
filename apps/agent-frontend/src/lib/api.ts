const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function submitWorkflow(initialState: any): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/workflow/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initial_state: initialState }),
  });
  return res.json();
}

export async function extractProfile(formData: any, cvText?: string): Promise<{ profile: any }> {
  const res = await fetch(`${API_BASE}/profile/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form_data: formData, cv_text: cvText }),
  });
  return res.json();
}

export async function getSession(sessionId: string): Promise<{ session_id: string; blueprint: any }> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`);
  return res.json();
}
