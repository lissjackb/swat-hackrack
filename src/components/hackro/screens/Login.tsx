"use client";
// vLogin (mockup 844–859).
import { sx } from "@/lib/hackro/sx";
import { useHackro } from "@/lib/hackro/store";

export function Login() {
  const { S, A } = useHackro();
  return (
    <div className="bd" style={sx("justify-content:space-between;padding-top:72px")}>
      <div className="g" style={sx("gap:20px")}>
        <div className="brand">HACKRO</div>
        <h1 className="h1" style={sx("font-size:40px")}>Hack the dining hall</h1>
        <p className="sub">Stop guessing, we got you</p>
      </div>
      <form className="g" style={sx("gap:12px")} onSubmit={(e) => { e.preventDefault(); A.login(); }}>
        <label className="field">
          <span>School email</span>
          <input className="inp" type="email" name="email" autoComplete="email" placeholder="you@swarthmore.edu"
            value={S.p.email} onChange={(e) => A.field("email", e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="inp" type="password" name="pw" autoComplete="current-password" placeholder="Any password works in the demo" />
        </label>
        <button className="cta" type="submit" style={sx("margin-top:8px")}>Sign in</button>
        <button className="ghost" type="button" onClick={() => A.login()}>Create an account</button>
        <p className="note" style={sx("text-align:center;margin:0")}>Demo build. Nothing is sent anywhere; your answers stay in this browser.</p>
      </form>
    </div>
  );
}
