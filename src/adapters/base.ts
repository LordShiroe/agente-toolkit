export interface ModelAdapter {
  name: string;
  complete(prompt: string, options?: { apiKey?: string; model?: string }): Promise<string>;
}
