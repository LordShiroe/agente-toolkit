/**
 * Utility functions for parsing JSON responses from LLMs
 */

/**
 * Extract and parse JSON from LLM responses that may contain markdown code blocks
 * @param response The raw response from an LLM
 * @returns Parsed JSON object
 * @throws Error if no valid JSON is found
 */
export function parseJsonFromResponse(response: string): any {
  const trimmed = response.trim();

  // Try to parse as-is first (for clean JSON responses)
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to extract from markdown
  }

  // Look for JSON wrapped in markdown code blocks
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = trimmed.match(jsonBlockRegex);

  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      // Continue to other extraction methods
    }
  }

  // Look for JSON between curly braces or square brackets
  const jsonPattern = /(\[[\s\S]*\]|\{[\s\S]*\})/;
  const jsonMatch = trimmed.match(jsonPattern);

  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      // Final fallback failed
    }
  }

  throw new Error(`Could not extract valid JSON from response: ${response}`);
}

/**
 * Check if a string contains JSON (either raw or in markdown)
 * @param response The response to check
 * @returns True if JSON is detected
 */
export function containsJson(response: string): boolean {
  try {
    parseJsonFromResponse(response);
    return true;
  } catch {
    return false;
  }
}
