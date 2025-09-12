export interface ModelAdapter {
  name: string;
  complete(
    prompt: string,
    options?: { apiKey?: string; model?: string | string[] }
  ): Promise<string>;
}
