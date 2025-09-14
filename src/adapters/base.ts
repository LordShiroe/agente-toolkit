export interface ModelAdapter {
  name: string;
  complete(prompt: string): Promise<string>;
}

export abstract class BaseAdapter implements ModelAdapter {
  abstract name: string;
  abstract complete(prompt: string): Promise<string>;
  async sendMessage(prompt: string): Promise<string> {
    return this.complete(prompt);
  }
}
