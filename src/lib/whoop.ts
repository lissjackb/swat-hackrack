// WHOOP OAuth 2.0 + live data fetch. Pulls the connected user's real recovery
// and day strain. Tokens are stored per profile (WhoopToken) and refreshed on
// demand (access tokens expire in ~1hr). The /api/whoop route still defaults
// to the seeded mock so the DEMO never depends on this being up (CLAUDE.md).
//
// Endpoints (verified against developer.whoop.com):
//   authorize  https://api.prod.whoop.com/oauth/oauth2/auth
//   token      https://api.prod.whoop.com/oauth/oauth2/token
//   recovery   GET https://api.prod.whoop.com/developer/v2/recovery?limit=1
//   cycle      GET https://api.prod.whoop.com/developer/v2/cycle?limit=1
import { db } from "./db";

const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API_BASE = "https://api.prod.whoop.com/developer";
// offline => refresh token; read:recovery => recovery_score; read:cycles => strain.
const SCOPES = ["offline", "read:recovery", "read:cycles"];
const TIMEOUT_MS = 8000;

function clientId(): string {
  return process.env.WHOOP_CLIENT_ID ?? "";
}
function clientSecret(): string {
  return process.env.WHOOP_CLIENT_SECRET ?? "";
}
export function redirectUri(): string {
  return process.env.WHOOP_REDIRECT_URI ?? "http://localhost:3000/api/whoop/callback";
}
export function isConfigured(): boolean {
  return Boolean(clientId() && clientSecret());
}

/** The URL to send the user to for consent. `state` carries CSRF + profileId. */
export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

function parseTokenResponse(json: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}, prevRefresh?: string): TokenSet {
  return {
    accessToken: json.access_token,
    // WHOOP rotates refresh tokens; fall back to the previous one if absent.
    refreshToken: json.refresh_token ?? prevRefresh ?? "",
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
    scope: json.scope ?? SCOPES.join(" "),
  };
}

async function postToken(body: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    throw new Error(`WHOOP token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return parseTokenResponse(await res.json(), body.refresh_token);
}

/** Exchange an authorization code for tokens, then store them for the profile. */
export async function exchangeCodeAndStore(code: string, profileId: string): Promise<void> {
  const tokens = await postToken({
    grant_type: "authorization_code",
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
  });
  await storeTokens(profileId, tokens);
}

async function storeTokens(profileId: string, t: TokenSet): Promise<void> {
  await db.whoopToken.upsert({
    where: { profileId },
    create: { profileId, accessToken: t.accessToken, refreshToken: t.refreshToken, expiresAt: t.expiresAt, scope: t.scope },
    update: { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresAt: t.expiresAt, scope: t.scope },
  });
}

/** Load the profile's token, refreshing it first if it's expired/near expiry. */
async function validAccessToken(profileId: string): Promise<string | null> {
  const row = await db.whoopToken.findUnique({ where: { profileId } });
  if (!row) return null;
  // Refresh if it expires within 60s.
  if (row.expiresAt.getTime() - Date.now() > 60_000) return row.accessToken;
  const refreshed = await postToken({
    grant_type: "refresh_token",
    refresh_token: row.refreshToken,
    client_id: clientId(),
    client_secret: clientSecret(),
    scope: SCOPES.join(" "),
  });
  await storeTokens(profileId, refreshed);
  return refreshed.accessToken;
}

async function getJson(path: string, token: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`WHOOP ${path} ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// WHOOP v2 collections return { records: [{ score: {...} }, ...] }.
function firstScore(json: unknown): Record<string, number> | null {
  const records = (json as { records?: { score?: Record<string, number> }[] })?.records;
  return records?.[0]?.score ?? null;
}

export interface LiveWhoop {
  recovery: number; // 0-100
  strain: number; // 0-21
}

/**
 * Fetch the connected profile's latest recovery + strain. Returns null if the
 * profile isn't connected or the live call fails (caller falls back to mock).
 */
export async function fetchLiveWhoop(profileId: string): Promise<LiveWhoop | null> {
  if (!isConfigured()) return null;
  try {
    const token = await validAccessToken(profileId);
    if (!token) return null;
    const [recoveryJson, cycleJson] = await Promise.all([
      getJson("/v2/recovery?limit=1", token),
      getJson("/v2/cycle?limit=1", token),
    ]);
    const recoveryScore = firstScore(recoveryJson);
    const cycleScore = firstScore(cycleJson);
    const recovery = recoveryScore?.recovery_score;
    const strain = cycleScore?.strain;
    if (typeof recovery !== "number" || typeof strain !== "number") return null;
    return { recovery: Math.round(recovery), strain };
  } catch (err) {
    console.warn(`WHOOP live fetch failed for ${profileId}:`, (err as Error).message);
    return null;
  }
}

export async function isConnected(profileId: string): Promise<boolean> {
  return Boolean(await db.whoopToken.findUnique({ where: { profileId } }));
}
