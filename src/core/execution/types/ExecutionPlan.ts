import { PlanStep } from './PlanStep';

export interface ExecutionPlan {
  steps: PlanStep[];
  context: Record<string, any>;
}
