import axios from "axios";
import { timeline } from "../../timeline";

export interface BrowserResult {
  url: string;
  status: number;
  contentSnippet: string;
  contentType?: string;
}

/**
 * Minimal Web / Browser tool for the agent.
 *
 * Allows the agent to fetch external HTTP/HTTPS resources (e.g. docs, APIs)
 * in a controlled way and work with a truncated text snippet of the response.
 */
export class BrowserTool {
  async fetch(url: string, maxChars: number = 20000): Promise<BrowserResult> {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new Error("Only http/https URLs are supported by BrowserTool");
    }

    const isLocalhost = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test(trimmed);
    const risk: "low" | "medium" | "high" = isLocalhost ? "low" : "medium";

    try {
      timeline.log("ai_request", "BrowserTool.fetch", {
        url: trimmed,
        risk,
      });
    } catch {
      // timeline is best-effort; ignore logging failures
    }

    const response = await axios.get(trimmed, {
      responseType: "text",
      maxContentLength: maxChars * 4, // bytes; generous but bounded
    });

    const raw = typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data);

    return {
      url: trimmed,
      status: response.status,
      contentSnippet: raw.slice(0, maxChars),
      contentType: response.headers["content-type"],
    };
  }
}
