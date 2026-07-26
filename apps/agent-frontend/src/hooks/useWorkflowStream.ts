import { useState, useCallback, useRef, useEffect } from "react";
import type { WorkflowEvent } from "../lib/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useWorkflowStream() {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (initialState: any) => {
    setEvents([]);
    setBlueprint(null);
    setError(null);
    setIsStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/workflow/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initial_state: initialState }),
      });
      const { job_id } = await res.json();

      const es = new EventSource(`${API_BASE}/api/v1/workflow/${job_id}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WorkflowEvent;
          setEvents((prev) => [...prev, data]);

          if (data.type === "finish") {
            es.close();
            setIsStreaming(false);
          }
        } catch {
          // skip non-JSON events
        }
      };

      es.onerror = () => {
        setError("Stream connection failed");
        es.close();
        setIsStreaming(false);
      };
    } catch (e) {
      setError(String(e));
      setIsStreaming(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  return { events, blueprint, isStreaming, error, startStream, stopStream };
}
