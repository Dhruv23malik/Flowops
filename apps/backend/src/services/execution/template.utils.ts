/**
 * Resolve a dot-separated path (e.g. "summary.urgency" or "input.feedback")
 * against an execution context outputs object.
 */
export function resolveContextPath(path: string, obj: unknown): unknown {
  if (!obj || typeof obj !== 'object' || !path) return undefined;
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Interpolate `{{dot.path}}` placeholders in a template string using values
 * from the execution outputs. Missing keys resolve to an empty string;
 * objects and arrays are serialized with JSON.stringify.
 */
export function interpolateTemplate(
  template: string,
  outputs: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, rawPath: string) => {
    const val = resolveContextPath(rawPath, outputs);
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });
}
