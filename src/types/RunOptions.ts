export interface RunOptions {
  maxSteps?: number; // safety ceiling for number of executed steps in a run
  maxDurationMs?: number; // safety ceiling for total elapsed time in a run
  stopOnFirstToolError?: boolean; // if true, stop execution on the first tool failure
  requiredOutputRegex?: string; // if provided, execution attempts to continue until output matches
}
