export interface PlanStep {
  id: string;
  toolName: string;
  params: any;
  dependsOn: string[];
  status: 'pending' | 'completed' | 'failed';
  result?: string;
}
