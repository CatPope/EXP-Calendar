// API client wrapper.
// Spec: docs/for_ai/spec/api_and_rules.md
//
// - Reads Authorization automatically from localStorage tokens.
// - On 401, attempts /api/auth/refresh once and retries.
// - Unwraps { data } on success, throws ApiError on { error } / network failure.

import { getStoredAccessToken, getStoredRefreshToken, setTokens, clearTokens } from "./auth";
import type {
  AuthResponse,
  CompleteResponse,
  Difficulty,
  Quest,
  QuestType,
  Schedule,
  ShopItem,
  ShowcaseDetail,
  ShowcaseSummary,
  User,
  UserTitle,
  Purchase,
  CharacterType,
  Tendency
} from "./types";

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface ApiSuccess<T> {
  data: T;
}
interface ApiFailure {
  error: { code: string; message: string };
}

async function rawFetch(
  path: string,
  init: RequestInit,
  token: string | null
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (
    !headers.has("Content-Type") &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  return fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: "omit" });
}

async function tryRefresh(): Promise<string | null> {
  const refresh = getStoredRefreshToken();
  if (!refresh) return null;
  try {
    const res = await rawFetch(
      "/api/auth/refresh",
      { method: "POST", body: JSON.stringify({ refresh_token: refresh }) },
      null
    );
    if (!res.ok) return null;
    const json = (await res.json()) as
      | ApiSuccess<{ access_token: string }>
      | ApiFailure;
    if ("error" in json) return null;
    setTokens(json.data.access_token);
    return json.data.access_token;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let token = getStoredAccessToken();
  let res: Response;
  try {
    res = await rawFetch(path, init, token);
  } catch (e) {
    throw new ApiError(
      "NETWORK_ERROR",
      e instanceof Error ? e.message : "네트워크 오류",
      0
    );
  }

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      token = newToken;
      try {
        res = await rawFetch(path, init, token);
      } catch (e) {
        throw new ApiError(
          "NETWORK_ERROR",
          e instanceof Error ? e.message : "네트워크 오류",
          0
        );
      }
    } else {
      clearTokens();
    }
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  let json: ApiSuccess<T> | ApiFailure | null = null;
  try {
    json = (await res.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    throw new ApiError(
      "INVALID_JSON",
      `서버 응답을 해석할 수 없습니다 (HTTP ${res.status})`,
      res.status
    );
  }

  if (!res.ok || !json || "error" in json) {
    const err =
      (json && "error" in json && json.error) || {
        code: "UNKNOWN",
        message: `HTTP ${res.status}`
      };
    throw new ApiError(err.code, err.message, res.status);
  }

  return json.data;
}

export function humanizeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return "서버에 연결할 수 없습니다.";
    if (e.status === 401) return "로그인이 필요합니다.";
    if (e.status === 403) return "권한이 없습니다.";
    if (e.status === 404) return "요청한 자원을 찾을 수 없습니다.";
    if (e.status === 409) return e.message || "이미 처리된 요청입니다.";
    if (e.status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return e.message || "요청을 처리할 수 없습니다.";
  }
  if (e instanceof Error) return e.message;
  return "알 수 없는 오류가 발생했습니다.";
}

// ---------- Typed endpoint helpers ----------

export const Api = {
  // auth
  devLogin: (email: string, display_name: string) =>
    apiFetch<AuthResponse>("/api/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ email, display_name })
    }),
  googleLogin: (id_token: string) =>
    apiFetch<AuthResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token })
    }),
  logout: () =>
    apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  // user
  me: () => apiFetch<User>("/api/me"),
  onboarding: (tendency: Tendency) =>
    apiFetch<{ ok: true }>("/api/me/onboarding", {
      method: "POST",
      body: JSON.stringify({ tendency })
    }),

  // schedules
  listSchedules: (from: string, to: string) =>
    apiFetch<Schedule[]>(`/api/schedules?from=${from}&to=${to}`),
  createSchedule: (payload: {
    title: string;
    description?: string;
    difficulty: Difficulty;
    due_date: string;
  }) =>
    apiFetch<Schedule>("/api/schedules", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  patchSchedule: (id: string, patch: Partial<Schedule>) =>
    apiFetch<Schedule>(`/api/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    }),
  deleteSchedule: (id: string) =>
    apiFetch<{ ok: true }>(`/api/schedules/${id}`, { method: "DELETE" }),
  completeSchedule: (id: string) =>
    apiFetch<CompleteResponse>(`/api/schedules/${id}/complete`, {
      method: "POST"
    }),

  // quests
  todayQuests: () => apiFetch<Quest[]>("/api/quests/today"),
  completeQuest: (qt: QuestType) =>
    apiFetch<{ completed: boolean; reward_points: number; current_points: number }>(
      `/api/quests/${qt}/complete`,
      { method: "POST" }
    ),

  // shop
  listShop: () => apiFetch<ShopItem[]>("/api/shop/items"),
  purchase: (item_id: string) =>
    apiFetch<{ purchase: Purchase; remaining_points: number }>(
      "/api/shop/purchase",
      { method: "POST", body: JSON.stringify({ item_id }) }
    ),

  // titles
  myTitles: () => apiFetch<UserTitle[]>("/api/titles/me"),
  patchTitle: (id: string, patch: { is_equipped?: boolean; is_displayed?: boolean }) =>
    apiFetch<UserTitle>(`/api/titles/${id}/equip`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    }),

  // persona / showcase
  generatePersona: (text: string, character_type?: CharacterType) =>
    apiFetch<{ llm_output: string; character_type: string }>(
      "/api/persona/generate",
      { method: "POST", body: JSON.stringify({ text, character_type }) }
    ),
  postShowcase: (text: string) =>
    apiFetch<{ showcase_text: string; llm_output: string }>(
      "/api/persona/showcase",
      { method: "POST", body: JSON.stringify({ text }) }
    ),
  listShowcase: () => apiFetch<ShowcaseSummary[]>("/api/showcase"),
  showcaseDetail: (user_id: string) =>
    apiFetch<ShowcaseDetail>(`/api/showcase/${user_id}`),

  // stats
  grass: (days = 365) =>
    apiFetch<Record<string, number>>(`/api/stats/grass?days=${days}`)
};
