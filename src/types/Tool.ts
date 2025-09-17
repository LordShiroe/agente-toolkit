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
