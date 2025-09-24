import { TSchema, Static } from '@sinclair/typebox';

// Type for serializable values
export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string]: Serializable };

export interface Tool<TParams extends TSchema = TSchema, TResult extends Serializable = string> {
  name: string;
  description: string;
  paramsSchema: TParams;
  action: (params: Static<TParams>) => Promise<TResult>;
}

// Optional helper types for ergonomic typing in wrappers
export type ToolParams<T extends Tool<any, any>> = T extends Tool<infer P, any> ? Static<P> : never;
export type ToolResult<T extends Tool<any, any>> = T extends Tool<any, infer R> ? R : never;
