// GET /api/whoop/callback?code=&state=  — WHOOP OAuth redirect target.
// Exchanges the authorization code for tokens, stores them for the profile,
// then sends the user back into the app. Must match the redirect URI
// registered in the WHOOP developer dashboard (WHOOP_REDIRECT_URI).
import { exchangeCodeAndStore } from "@/lib/whoop";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const denied = searchParams.get("error");

  if (denied) {
    return Response.json({ error: `WHOOP authorization denied: ${denied}` }, { status: 400 });
  }
  if (!code || !state) {
    return Response.json({ error: "missing code or state" }, { status: 400 });
  }

  let profileId = "demo-profile";
  try {
    profileId = JSON.parse(Buffer.from(state, "base64url").toString("utf8")).p ?? profileId;
  } catch {
    return Response.json({ error: "bad state parameter" }, { status: 400 });
  }

  try {
    await exchangeCodeAndStore(code, profileId);
  } catch (err) {
    return Response.json(
      { error: `token exchange failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  // Back into the app; the UI can read ?whoop=connected.
  return Response.redirect(new URL("/?whoop=connected", request.url).toString(), 302);
}
