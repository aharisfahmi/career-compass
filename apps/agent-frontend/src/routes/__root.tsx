import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useParams,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProfileForm } from "../components/ProfileForm";
import { CvUpload } from "../components/CvUpload";
import { WorkflowProgress } from "../components/WorkflowProgress";
import { CareerBlueprint as CareerBlueprintComponent } from "../components/CareerBlueprint";
import { AgentTrace } from "../components/AgentTrace";
import { useWorkflowStream } from "../hooks/useWorkflowStream";

const btnStyle: React.CSSProperties = {
  padding: "12px 24px",
  background: "#0070f3",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  marginRight: "12px",
  marginTop: "16px",
  fontSize: "16px",
};

const rootRoute = createRootRoute({
  component: () => (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <Outlet />
    </div>
  ),
});

function HomePage() {
  const [step, setStep] = useState<"input" | "confirm" | "processing" | "result">("input");
  const [formData, setFormData] = useState<any>(null);
  const [cvText, setCvText] = useState<string>("");
  const { events, isStreaming, error, startStream, stopStream } = useWorkflowStream();
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = (data: any) => {
    setFormData(data);
    setStep("confirm");
  };

  const handleCvExtracted = (text: string) => {
    setCvText(text);
  };

  const handleConfirm = () => {
    setStep("processing");
    startStream({
      raw_cv_text: cvText || null,
      user_input_form: formData || {},
    });
  };

  const handleReset = () => {
    setStep("input");
    setFormData(null);
    setCvText("");
    setShowResult(false);
    stopStream();
  };

  const finishEvent = events.find((e) => e.type === "finish");
  if (finishEvent && step === "processing" && !showResult) {
    setTimeout(() => setShowResult(true), 300);
  }

  if (step === "input") {
    return (
      <>
        <h1>CareerCompass</h1>
        <CvUpload onExtracted={handleCvExtracted} />
        <hr style={{ margin: "20px 0" }} />
        <ProfileForm onSubmit={handleSubmit} cvText={cvText} />
      </>
    );
  }

  if (step === "confirm") {
    return (
      <div>
        <h2>Konfirmasi Profil</h2>
        <pre style={{ background: "#f5f5f5", padding: "16px", borderRadius: "8px" }}>
          {JSON.stringify(formData, null, 2)}
        </pre>
        {cvText && <p style={{ color: "green" }}>CV berhasil diproses</p>}
        <button onClick={handleConfirm} style={btnStyle}>
          Proses Career Blueprint
        </button>
        <button onClick={handleReset} style={{ ...btnStyle, background: "#999" }}>
          Edit Kembali
        </button>
      </div>
    );
  }

  if (step === "processing" && !showResult) {
    return (
      <div>
        <h2>Memproses...</h2>
        <WorkflowProgress events={events} />
        <AgentTrace events={events} />
        {error && <p style={{ color: "red" }}>Error: {error}</p>}
      </div>
    );
  }

  return (
    <div>
      <CareerBlueprintComponent events={events} />
      <button onClick={handleReset} style={btnStyle}>
        Mulai Lagi
      </button>
    </div>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

function BlueprintPage() {
  const { sessionId } = useParams({ from: "/blueprint/$sessionId" });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("../lib/api").then(({ getSession }) =>
      getSession(sessionId)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false))
    );
  }, [sessionId]);

  if (loading) return <p>Loading...</p>;
  if (!data) return <p>Session not found</p>;

  return (
    <div>
      <h2>Career Blueprint - {sessionId}</h2>
      <pre style={{ background: "#f5f5f5", padding: "16px", borderRadius: "8px", overflow: "auto" }}>
        {JSON.stringify(data.blueprint, null, 2)}
      </pre>
    </div>
  );
}

const blueprintRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/blueprint/$sessionId",
  component: BlueprintPage,
});

const routeTree = rootRoute.addChildren([indexRoute, blueprintRoute]);

export const router = createRouter({ routeTree });
