/**
 * Redaction helpers for safe structured logging.
 *
 * Query parameters whose values must never appear in logs (tokens, refresh
 * tokens, push endpoints, keys, secrets, one-time codes).
 */
const SENSITIVE_QUERY_KEYS = new Set([
  "token",
  "refreshToken",
  "refresh_token",
  "access_token",
  "endpoint",
  "code",
  "key",
  "secret",
  "signature",
  "webhook",
  "password",
]);

/** Returns the request path with sensitive query values redacted. */
export function redactUrl(raw: string): string {
  const qIndex = raw.indexOf("?");
  if (qIndex < 0) return raw;
  const path = raw.slice(0, qIndex);
  try {
    const params = new URLSearchParams(raw.slice(qIndex + 1));
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        params.set(key, "[REDACTED]");
      }
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  } catch {
    return path;
  }
}

/** Redacts `key=value` pairs for sensitive keys anywhere in a string. */
export function redactSensitiveQuery(text: string): string {
  return text.replace(
    /([?&])([A-Za-z_]+)=[^&\s]+/g,
    (match, sep: string, key: string) =>
      SENSITIVE_QUERY_KEYS.has(key.toLowerCase())
        ? `${sep}${key}=[REDACTED]`
        : match,
  );
}
