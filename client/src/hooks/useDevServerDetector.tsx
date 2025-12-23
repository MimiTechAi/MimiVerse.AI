import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface DevServerStatus {
  running: boolean;
  port?: number;
  url?: string;
}

interface UseDevServerDetectorOptions {
  /** Called when a previously stopped dev server is detected as running. */
  onDevServerDetected?: (status: DevServerStatus) => void;
  /** Poll interval in milliseconds. */
  pollIntervalMs?: number;
}

/**
 * Polls /api/preview/status in the background and fires a toast when
 * a dev server (localhost) is detected. The toast offers an action to
 * open the Preview panel.
 */
export function useDevServerDetector(
  { onDevServerDetected, pollIntervalMs = 10000 }: UseDevServerDetectorOptions = {},
) {
  useEffect(() => {
    let cancelled = false;
    let wasRunning = false;

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/preview/status");
        if (!res.ok) return;

        const data = (await res.json()) as DevServerStatus;
        if (cancelled) return;

        if (data.running) {
          if (!wasRunning) {
            wasRunning = true;

            toast({
              title: "Dev server detected",
              description:
                data.url
                  ? `Your app is running at ${data.url}. Open live preview?`
                  : "Your dev server is running. Open live preview?",
              action: (
                <ToastAction
                  altText="Open Preview"
                  onClick={() => onDevServerDetected?.(data)}
                >
                  Open Preview
                </ToastAction>
              ),
            });
          }
        } else {
          wasRunning = false;
        }
      } catch {
        // Ignore network errors silently; user can still open Preview manually.
      }
    };

    // Initial check and interval
    void checkStatus();
    const id = setInterval(() => void checkStatus(), pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [onDevServerDetected, pollIntervalMs]);
}
