/**
 * Escape untrusted text (AI output, member text, stored summaries) at the final
 * HTML render boundary. Never escape before storage, that double-encodes and
 * does not protect other output contexts.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Tagged template that escapes every interpolated value. */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce(
    (out, chunk, i) => out + chunk + (i < values.length ? escapeHtml(values[i]) : ""),
    "",
  );
}
