// GET /api/whoop/connect?profileId=  — start the WHOOP OAuth flow.
// Redirects the user to WHOOP's consent screen. After they approve, WHOOP
// sends them to /api/whoop/callback with an authorization code.
import { authorizeUrl, isConfigured } from "@/lib/whoop";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? "demo-profile";

  if (!isConfigured()) {
    return Response.json(
      { error: "WHOOP not configured — set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in .env.local" },
      { status: 501 },
    );
  }

  // `state` is required (≥8 chars) and carries the profileId through the
  // round-trip so the callback knows whose tokens to store. base64url-encoded
  // with a random nonce. (CSRF note: not cookie-verified — fine for the local
  // single-user demo; harden before any multi-user deploy.)
  const nonce = crypto.randomUUID();
  const state = Buffer.from(JSON.stringify({ p: profileId, n: nonce })).toString("base64url");

  return Response.redirect(authorizeUrl(state), 302);
}
