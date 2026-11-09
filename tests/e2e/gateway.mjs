// Faux Supabase local : /rest/v1 → PostgREST, /auth/v1 → mini GoTrue (tests E2E uniquement)
import http from "node:http";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";
const b64u = (b) => Buffer.from(b).toString("base64url");
export function sign(payload) {
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify(payload));
  const s = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}
function verify(tok) {
  const [h, p, s] = (tok || "").split(".");
  if (!s) return null;
  const ok = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url") === s;
  if (!ok) return null;
  const c = JSON.parse(Buffer.from(p, "base64url"));
  return c.exp > Date.now() / 1000 ? c : null;
}
const userOf = (c) => ({ id: c.sub, aud: "authenticated", role: "authenticated", email: c.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(obj === undefined ? "" : JSON.stringify(obj)); };

  if (url.pathname.startsWith("/rest/v1")) {
    const headers = { ...req.headers }; delete headers.host; delete headers["content-length"];
    if (!headers.authorization || headers.authorization === `Bearer ${process.env.ANON}`) headers.authorization = `Bearer ${sign({ role: "anon", exp: 2e9 })}`;
    const r = await fetch(`http://localhost:3001${url.pathname.slice(8)}${url.search}`, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
    const h = {}; r.headers.forEach((v, k) => { if (!["content-encoding", "transfer-encoding", "content-length"].includes(k)) h[k] = v; });
    res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  if (url.pathname === "/auth/v1/user") {
    const c = verify((req.headers.authorization || "").replace("Bearer ", ""));
    return c ? send(200, userOf(c)) : send(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
  }
  if (url.pathname === "/auth/v1/otp") {
    fs.appendFileSync("/var/tmp/e2e/otp.log", body.toString() + "\n");
    return send(200, {});
  }
  if (url.pathname === "/auth/v1/logout") return send(204);
  if (url.pathname === "/auth/v1/token") {
    const { refresh_token } = JSON.parse(body.toString() || "{}");
    const c = verify(refresh_token);
    if (!c) return send(400, { error: "invalid_grant" });
    return send(200, session(c.sub, c.email));
  }
  if (url.pathname === "/auth/v1/.well-known/jwks.json") return send(200, { keys: [] });
  send(404, { error: "not mocked", path: url.pathname });
});

export function session(sub, email) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access_token = sign({ sub, email, role: "authenticated", aud: "authenticated", exp });
  return { access_token, refresh_token: sign({ sub, email, exp: exp + 86400 }), token_type: "bearer", expires_in: 3600, expires_at: exp, user: userOf({ sub, email }) };
}

if (process.argv[2] === "serve") server.listen(54321, () => console.log("gateway :54321"));
