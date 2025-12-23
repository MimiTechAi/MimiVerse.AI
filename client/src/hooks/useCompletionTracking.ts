import { useCallback, useState } from "react";

export interface CompletionEventPayload {
  completionId?: string;
  eventType: string;
  accepted?: boolean;
  model?: string;
  latencyMs?: number;
}

/**
 * Frontend hook to send completion usage/acceptance events
 * to the backend analytics endpoint.
 */
export function useCompletionTracking() {
  const [isSending, setIsSending] = useState(false);

  const trackCompletion = useCallback(async (payload: CompletionEventPayload) => {
    try {
      setIsSending(true);
      await fetch("/api/v1/analytics/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("[useCompletionTracking] Failed to send completion event", error);
    } finally {
      setIsSending(false);
    }
  }, []);

  return { trackCompletion, isSending };
}
