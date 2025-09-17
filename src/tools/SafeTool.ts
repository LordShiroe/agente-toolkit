import { Tool } from '../types/Tool';

export interface SafeOptions {
  timeoutMs?: number;
  maxRetries?: number;
  backoffMs?: number;
}

export function withSafety<TParamsSchema, TResult>(
  tool: Tool<any, any>,
  options: SafeOptions
): Tool<any, any> {
  const { timeoutMs = 0, maxRetries = 0, backoffMs = 0 } = options || {};

  const timeout = <T>(p: Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      const t = timeoutMs > 0 ? setTimeout(() => reject(new Error('Tool timeout')), timeoutMs) : 0;
      p.then(v => {
        if (t) clearTimeout(t as any);
        resolve(v);
      }).catch(e => {
        if (t) clearTimeout(t as any);
        reject(e);
      });
    });

  return {
    ...tool,
    action: async params => {
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const p = tool.action(params as any);
          const res = timeoutMs > 0 ? await timeout(p) : await p;
          return res as any;
        } catch (err) {
          if (attempt >= maxRetries) throw err instanceof Error ? err : new Error(String(err));
          attempt++;
          if (backoffMs > 0) await new Promise(r => setTimeout(r, backoffMs));
        }
      }
    },
  } as Tool<any, any>;
}
