import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Cookie value = "<opaque session id>.<hmac signature>". The id alone is
// what's stored in Postgres (UserSession/AdminSession), so deleting that
// row revokes the session immediately; the signature just stops a client
// from presenting an id it was never issued.

export function signSessionId(sessionId: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(sessionId).digest("hex");
  return `${sessionId}.${sig}`;
}

export function verifySessionCookie(cookieValue: string, secret: string): string | null {
  const dot = cookieValue.lastIndexOf(".");
  if (dot === -1) return null;
  const sessionId = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(sessionId).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(sig, "hex");
  if (expectedBuf.length !== gotBuf.length || !timingSafeEqual(expectedBuf, gotBuf)) {
    return null;
  }
  return sessionId;
}

export function newSessionId(): string {
  return randomBytes(24).toString("base64url");
}
