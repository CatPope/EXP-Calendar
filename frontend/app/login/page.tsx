"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, humanizeError, ApiError } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import type { AuthResponse, User } from "@/lib/types";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";
import { useT } from "@/lib/i18n";
import { LogIn, Sparkles, UserPlus } from "lucide-react";

type AuthMode = "login" | "signup";

// 데모/쇼케이스 목적상 prod 모드에서도 dev-login 폼을 노출한다.
// 실제 운영 배포 시에는 아래 가드를 복원하고 정식 OAuth/비밀번호 인증으로 교체할 것.
// const DEV_MODE = process.env.NEXT_PUBLIC_APP_MODE !== "prod";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
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
    const body =
      mode === "signup"
        ? { email, password, display_name: displayName }
        : { email, password };
    try {
      const data = await apiFetch<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
      });
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      // 신규 가입은 성향 설문(온보딩)으로, 로그인은 캘린더로.
      router.replace(mode === "signup" ? "/onboarding" : "/calendar");
    } catch (e) {
      // 없는 계정으로 로그인 시도 → 회원가입 모드로 안내.
      if (e instanceof ApiError && e.code === "NEED_SIGNUP") {
        setMode("signup");
        setErr(t("common.loginNeedSignup"));
      } else if (e instanceof ApiError && e.code === "ALREADY_EXISTS") {
        setMode("login");
        setErr(t("common.loginAlreadyExists"));
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
          {t("common.loginTagline")}
        </p>

        {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}

        {GOOGLE_CLIENT_ID ? (
          <div className="flex flex-col items-center gap-2">
            <div id="g-btn" />
            {!googleReady && <Loading label={t("common.loginGooglePreparing")} />}
          </div>
        ) : (
          <div className="text-xs text-text-2 text-center">
            {t("common.loginGoogleUnconfigured")}
          </div>
        )}

        {/* 가드 제거: prod 모드에도 노출 (데모용). 원복 시 {DEV_MODE && ( ... )} 로 감쌀 것. */}
        <form onSubmit={handleDevAuth} className="space-y-2 border-t border-border pt-4">
            <div className="text-xs text-text-2">
              {mode === "signup" ? t("common.devSignup") : t("common.devLogin")}
            </div>
            <input
              type="email"
              autoComplete="email"
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("common.emailPlaceholder")}
              required
            />
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("common.passwordPlaceholder")}
              required
            />
            {mode === "signup" && (
              <input
                type="text"
                autoComplete="nickname"
                className="input w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("common.displayNamePlaceholder")}
                required
              />
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2">
              {mode === "signup" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {busy
                ? t("common.processing")
                : mode === "signup"
                  ? t("common.devSignup")
                  : t("common.devLogin")}
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
                ? t("common.switchToLogin")
                : t("common.switchToSignup")}
            </button>
          </form>
      </div>
    </main>
  );
}
