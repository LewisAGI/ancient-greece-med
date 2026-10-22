/**
 * Drop entries flagged `include: false`. The flag remains in the source JSON on disk.
 * Phrase checks live in the Vite plugin so those strings are not part of the client bundle.
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
