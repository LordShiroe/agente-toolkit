import { ModelAdapter } from "./base";
import Anthropic from "@anthropic-ai/sdk";

export class ClaudeAdapter implements ModelAdapter {
  name = "claude";

  async complete(prompt: string, options?: { apiKey?: string; model?: string | string[] }) {
  if (!options || !options.apiKey) throw new Error("API key required for Claude");
    const client = new Anthropic({ apiKey: options.apiKey });
    // If multiple models provided, pick the first
    let model: string | undefined;
    if (options) {
      if (Array.isArray(options.model)) model = options.model[0];
      else if (typeof options.model === 'string') model = options.model;
    }

    // Try the Messages API (preferred)
    try {
      const res = await client.messages.create({
        model: model ? model : "claude-2.1",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      });
      // SDK's Message response exposes `content` as the top-level assistant text
      const anyRes = res as any;
      const content = anyRes && (typeof anyRes.content === 'string' ? anyRes.content : (anyRes.message && typeof anyRes.message === 'string' ? anyRes.message : undefined));
      if (typeof content === "string")
        return content;
      // fallback to stringify whole response
      return JSON.stringify(res);
    } catch (err) {
      // Fallback to the legacy completions API if available
      try {
        const res = await client.completions.create({
          model: model ? model : "claude-2.1",
          prompt,
          max_tokens_to_sample: 1024,
        } as any);
        const anyRes = res as any;
        return anyRes && anyRes.completion ? anyRes.completion : JSON.stringify(res);
      } catch (err2) {
        // Surface a combined error message for easier debugging
        throw new Error(`Anthropic SDK error: ${String(err)} | fallback error: ${String(err2)}`);
      }
    }
  }
}
