export interface ModelAdapter {
  name: string;
  complete(prompt: string, options?: { model?: string }): Promise<string>;
}
