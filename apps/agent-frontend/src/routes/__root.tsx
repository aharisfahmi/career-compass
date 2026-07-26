import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useParams,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { ProfileForm } from "../components/ProfileForm";
import { CvUpload } from "../components/CvUpload";
import { ConfirmProfile } from "../components/ConfirmProfile";
import { ProcessingView } from "../components/ProcessingView";
import { CareerBlueprint as CareerBlueprintComponent } from "../components/CareerBlueprint";
import { useWorkflowStream } from "../hooks/useWorkflowStream";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

function HomePage() {
  const [step, setStep] = useState<"input" | "confirm" | "processing" | "result">("input");
  const [formData, setFormData] = useState<any>(null);
  const [cvText, setCvText] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const { events, isStreaming, error, startStream, stopStream } = useWorkflowStream();

  const handleSubmit = (data: any) => {
    setFormData(data);
    setStep("confirm");
  };

  const handleCvExtracted = async (text: string) => {
    setCvText(text);
    setExtracting(true);
    try {
      const { extractProfile } = await import("../lib/api");
      const res = await extractProfile({}, text);
      const profile = res.profile;
      const parsed = typeof profile === "string" ? JSON.parse(profile) : profile;
      const fd = {
        full_name: parsed.full_name || "",
        current_role: parsed.current_role || "",
        years_of_experience: Number(parsed.years_of_experience) || 0,
        hard_skills: Array.isArray(parsed.hard_skills) ? parsed.hard_skills : [],
        soft_skills: Array.isArray(parsed.soft_skills) ? parsed.soft_skills : [],
        education: parsed.education || "",
        target_roles: Array.isArray(parsed.target_roles) ? parsed.target_roles : [],
        learning_hours_per_week: Number(parsed.learning_hours_per_week) || 10,
        budget_idr: Number(parsed.budget_idr) || 0,
      };
      setFormData(fd);
      const hasRoles = Array.isArray(fd.target_roles) && fd.target_roles.length > 0;
      setStep(hasRoles ? "confirm" : "input");
    } catch {
      setStep("input");
    } finally {
      setExtracting(false);
    }
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
    stopStream();
  };

  const finishEvent = events.find((e) => e.type === "finish");
  if (finishEvent && step === "processing" && !isStreaming) {
    setTimeout(() => setStep("result"), 400);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {step === "input" && (
        <div className="animate-fade-in">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--color-text-heading)]">
              Career<span className="text-[var(--color-brand-600)]">Compass</span>
            </h1>
            <p className="mt-3 text-base sm:text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto">
              Temukan jalur karier terbaikmu. Analisis berbasis AI dan data pasar kerja nyata.
            </p>
          </div>

          {extracting ? (
            <div className="flex flex-col items-center gap-4 py-20 text-[var(--color-text-secondary)]">
              <div className="animate-spin w-8 h-8 border-2 border-[var(--color-brand-300)] border-t-[var(--color-brand-600)] rounded-full" />
              <p className="text-sm">Mengekstrak profil dari file...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-2">
                <div className="sticky top-24">
                  <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Upload CV</h2>
                  <CvUpload onExtracted={handleCvExtracted} />
                  <div className="mt-6 text-center">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--color-border)]" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-[var(--color-surface-secondary)] px-3 text-xs text-[var(--color-text-secondary)]">atau isi manual</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3">
                <ProfileForm onSubmit={handleSubmit} cvText={cvText} initialData={formData} />
              </div>
            </div>
          )}
        </div>
      )}

      {step === "confirm" && (
        <ConfirmProfile
          formData={formData}
          cvText={cvText}
          onConfirm={handleConfirm}
          onBack={handleReset}
        />
      )}

      {step === "processing" && !finishEvent && (
        <ProcessingView events={events} error={error} />
      )}

      {step === "result" && (
        <div className="animate-fade-in">
          <CareerBlueprintComponent events={events} />
          <div className="mt-10 text-center">
            <button onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-tertiary)] active:scale-[0.98] transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Mulai Lagi
            </button>
          </div>
        </div>
      )}
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

  if (loading) return <div className="text-center py-20 text-[var(--color-text-secondary)]">Loading...</div>;
  if (!data) return <div className="text-center py-20 text-[var(--color-text-secondary)]">Session not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-6">Career Blueprint - {sessionId}</h2>
      <pre className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm overflow-auto">
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
