/**
 * Drop entries flagged `include: false`. The flag stays in the source JSON when
 * a pack has one. Held-back ids are removed in the Vite plugin so the client
 * bundle does not embed those id strings.
 */
export function publishContent(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('content must be an object');
  }
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  Object.keys(input).forEach((key) => {
    const section = input[key];
    if (key === 'meta' || !Array.isArray(section)) {
      output[key] = section;
      return;
    }
    output[key] = section.filter((entry) => {
      if (typeof entry !== 'object' || entry === null) return false;
      return (entry as { include?: boolean }).include !== false;
    });
  });
  return output;
}
