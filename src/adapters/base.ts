export interface ModelAdapter {
  name: string;
  complete(prompt: string): Promise<string>;
}
