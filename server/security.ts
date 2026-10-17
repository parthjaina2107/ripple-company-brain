import type { RequestHandler } from "express";

export const productionOrigin = "https://ripple-company-brain.vercel.app";
export const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

export const requestSecurity: RequestHandler = (req, res, next) => {
  for (const [key, value] of Object.entries(securityHeaders)) res.setHeader(key, value);
  const origin = req.headers.origin;
  const allowed = new Set([process.env.APP_ORIGIN, productionOrigin]);
  if (!process.env.VERCEL) {
    for (const host of ["127.0.0.1", "localhost"]) {
      allowed.add(`http://${host}:5173`);
      allowed.add(`http://${host}:${process.env.PORT || 3001}`);
    }
  }
  res.vary("Origin");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  // An exact origin is deliberately also used by the static CDN configuration.
  // Credentials are never exposed to arbitrary cross-origin callers.
  res.setHeader("Access-Control-Allow-Origin", origin && allowed.has(origin) ? origin : productionOrigin);
  if (origin && !allowed.has(origin)) return void res.status(403).json({ error: "Origin not allowed." });
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Ripple-Company");
    return void res.sendStatus(204);
  }
  next();
};
