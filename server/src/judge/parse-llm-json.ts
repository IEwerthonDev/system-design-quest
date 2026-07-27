export class LlmParseError extends Error {
  constructor(message = 'Failed to parse LLM JSON response') {
    super(message);
    this.name = 'LlmParseError';
  }
}

function tryRepairJson(content: string): string | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return content.slice(start, end + 1);
}

/** Parse LLM JSON content with one in-string repair attempt before failing. */
export function parseLlmJsonContent<T>(content: string): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    const repaired = tryRepairJson(content);
    if (repaired === null) {
      throw new LlmParseError();
    }

    try {
      return JSON.parse(repaired) as T;
    } catch {
      throw new LlmParseError();
    }
  }
}
