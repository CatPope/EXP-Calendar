"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, humanizeError, ApiError } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import type { AuthResponse, User } from "@/lib/types";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";
import { LogIn, Sparkles, UserPlus } from "lucide-react";

type AuthMode = "login" | "signup";

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
  const [mode, setMode] = useState<AuthMode>("login");
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

  async function handleDevAuth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const endpoint = mode === "signup" ? "/api/auth/dev-signup" : "/api/auth/dev-login";
    try {
      const data = await apiFetch<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, display_name: displayName })
      });
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      // 신규 가입은 성향 설문(온보딩)으로, 로그인은 캘린더로.
      router.replace(mode === "signup" ? "/onboarding" : "/calendar");
    } catch (e) {
      // 없는 계정으로 로그인 시도 → 회원가입 모드로 안내.
      if (e instanceof ApiError && e.code === "NEED_SIGNUP") {
        setMode("signup");
        setErr("등록되지 않은 계정입니다. 회원가입으로 전환했습니다.");
      } else if (e instanceof ApiError && e.code === "ALREADY_EXISTS") {
        setMode("login");
        setErr("이미 가입된 계정입니다. 로그인으로 전환했습니다.");
      } else {
        setErr(humanizeError(e));
      }
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
          <form onSubmit={handleDevAuth} className="space-y-2 border-t border-border pt-4">
            <div className="text-xs text-text-2">
              {mode === "signup" ? "DEV 회원가입" : "DEV 로그인"}
            </div>
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
              {mode === "signup" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {busy
                ? "처리 중..."
                : mode === "signup"
                  ? "DEV 회원가입"
                  : "DEV 로그인"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === "signup" ? "login" : "signup"));
                setErr("");
              }}
              className="w-full text-xs text-text-2 hover:text-accent transition-colors pt-1"
            >
              {mode === "signup"
                ? "이미 계정이 있나요? 로그인"
                : "계정이 없나요? 회원가입"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
