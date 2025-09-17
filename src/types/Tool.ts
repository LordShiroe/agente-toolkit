import { TSchema } from '@sinclair/typebox';

export interface Tool<TParams = any> {
  name: string;
  description: string;
  paramsSchema: TSchema;
  action: (params: TParams) => Promise<string>;
}
