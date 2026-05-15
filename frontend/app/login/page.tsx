"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, humanizeError } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import type { AuthResponse, User } from "@/lib/types";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";
import { LogIn, Sparkles } from "lucide-react";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState("dev@example.com");
  const [displayName, setDisplayName] = useState("Dev User");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (window.google?.accounts) {
      initGoogle();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = initGoogle;
    document.body.appendChild(s);
    function initGoogle() {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogle
        });
        window.google.accounts.id.renderButton(document.getElementById("g-btn")!, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "signin_with"
        });
        setGoogleReady(true);
      } catch (e) {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogle(resp: { credential: string }) {
    setBusy(true);
    setErr("");
    try {
      const data = await apiFetch<AuthResponse>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ id_token: resp.credential })
      });
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      const me = await apiFetch<User>("/api/me");
      setUser(me);
      router.replace(me.persona_character_type ? "/calendar" : "/onboarding");
    } catch (e) {
      setErr(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const data = await apiFetch<AuthResponse>("/api/auth/dev-login", {
        method: "POST",
        body: JSON.stringify({ email, display_name: displayName })
      });
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      router.replace("/calendar");
    } catch (e) {
      setErr(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <Sparkles className="h-6 w-6" />
          <h1 className="text-2xl font-bold">EXP Calendar</h1>
        </div>
        <p className="text-text-2 text-sm">
          일정을 완료할 때마다 EXP와 포인트를 얻고, 칭호를 모아 보세요.
        </p>

        {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}

        {GOOGLE_CLIENT_ID ? (
          <div className="flex flex-col items-center gap-2">
            <div id="g-btn" />
            {!googleReady && <Loading label="Google 로그인 준비 중..." />}
          </div>
        ) : (
          <div className="text-xs text-text-2 text-center">
            Google OAuth 미설정. DEV 로그인을 사용하세요.
          </div>
        )}

        {DEV_MODE && (
          <form onSubmit={handleDevLogin} className="space-y-2 border-t border-border pt-4">
            <div className="text-xs text-text-2">DEV 로그인</div>
            <input
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              required
            />
            <input
              className="input w-full"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="표시 이름"
              required
            />
            <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2">
              <LogIn className="h-4 w-4" />
              {busy ? "로그인 중..." : "DEV 로그인"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
