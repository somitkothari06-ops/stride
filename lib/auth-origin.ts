const localOrigins = ["http://127.0.0.1:3100", "http://localhost:3100", "http://127.0.0.1:3000", "http://localhost:3000"];
function origins() {
  const configured = process.env.STRIDE_PUBLIC_ORIGIN;
  const values = configured ? [configured, ...(process.env.STRIDE_AUTH_ADDITIONAL_ORIGINS || "").split(",").filter(Boolean)] : localOrigins;
  return values.map(value => {
    const url = new URL(value.trim());
    if (!["http:","https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("AUTH_NOT_CONFIGURED");
    return url.origin;
  });
}
export function authFallbackOrigin() { return origins()[0]; }
export function authOrigin(request: Request) {
  const allowed = origins();
  const origin = request.headers.get("origin");
  if (origin) {
    if (allowed.includes(origin)) return origin;
    throw new Error("FORBIDDEN");
  }
  // Next's request.url may contain its 0.0.0.0 listen address behind a tunnel.
  // Proxy/Host headers can select only an explicitly allowed origin, never an
  // arbitrary redirect destination. Pin STRIDE_PUBLIC_ORIGIN for deployment.
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  const matches = allowed.filter(value => new URL(value).host === host);
  if (matches.length === 1) return matches[0];
  throw new Error("FORBIDDEN");
}
