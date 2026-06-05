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
  Tendency,
  QuestCompleteResult,
  QuestClaimResult,
  TitleCatalogEntry,
  StatsSummary,
  SeriesPoint,
  SummonInfo,
  SummonResult,
  GachaCharacter,
  OwnedCharacter,
  Settings
} from "./types";

// API base URL 은 NEXT_PUBLIC_APP_MODE 로부터 파생한다.
// - dev: 브라우저가 :3000(프론트) → :8080(백엔드) 직접 호출
// - prod: 같은 오리진의 /api/... 로 호출 → nginx 가 backend 로 프록시
//         외부 호스트(터널/내부 IP) 자동 대응을 위해 상대 경로 사용
const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "dev";
export const BASE_URL = APP_MODE === "prod" ? "" : "http://localhost:8080";

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
  setCharacterSkin: (skin: string) =>
    apiFetch<{ ok: true }>("/api/me/character", {
      method: "PATCH",
      body: JSON.stringify({ skin })
    }),
  updateProfile: (display_name: string) =>
    apiFetch<{ ok: true }>("/api/me/profile", {
      method: "PATCH",
      body: JSON.stringify({ display_name })
    }),
  // [v1.4] 구조화 페르소나 자유 편집(무료). 부분 갱신 허용.
  updatePersona: (fields: {
    persona_name?: string;
    persona_tone?: string;
    persona_history?: string;
    persona_thoughts?: string;
  }) =>
    apiFetch<User>("/api/me/persona", {
      method: "PATCH",
      body: JSON.stringify(fields)
    }),
  // [v1.4] 상태 메시지(대사) — 통계·등급 화면에서 편집, HUD/쇼케이스 노출.
  setStatusMessage: (status_message: string) =>
    apiFetch<User>("/api/me/status", {
      method: "PATCH",
      body: JSON.stringify({ status_message })
    }),
  // 코스메틱 장착/해제 — 보유한 cosmetic effect 중 하나(또는 "")로 설정.
  setCosmetic: (cosmetic: string) =>
    apiFetch<User>("/api/me/cosmetic", {
      method: "PATCH",
      body: JSON.stringify({ cosmetic })
    }),
  // [v1.4] 보유 방어권 1장 사용 → 장착/전시 칭호 페널티 복구.
  redeemDefenseTicket: () =>
    apiFetch<{ defense_tickets: number; cleared: boolean }>(
      "/api/titles/use-defense",
      { method: "POST" }
    ),

  // schedules
  listSchedules: (from: string, to: string) =>
    apiFetch<Schedule[]>(`/api/schedules?from=${from}&to=${to}`),
  createSchedule: (payload: {
    title: string;
    description?: string;
    difficulty: Difficulty;
    due_date: string;
    start_time?: string | null;
    end_time?: string | null;
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
  uncompleteSchedule: (id: string) =>
    apiFetch<{
      schedule: Schedule;
      exp_removed: number;
      points_removed: number;
      new_level: number;
    }>(`/api/schedules/${id}/uncomplete`, { method: "POST" }),

  // quests
  todayQuests: () => apiFetch<Quest[]>("/api/quests/today"),
  completeQuest: (qt: QuestType) =>
    apiFetch<QuestCompleteResult>(`/api/quests/${qt}/complete`, { method: "POST" }),
  claimQuest: (qt: QuestType) =>
    apiFetch<QuestClaimResult>(`/api/quests/${qt}/claim`, { method: "POST" }),

  // shop
  listShop: () => apiFetch<ShopItem[]>("/api/shop/items"),
  purchase: (item_id: string) =>
    apiFetch<{ purchase: Purchase; remaining_points: number }>(
      "/api/shop/purchase",
      { method: "POST", body: JSON.stringify({ item_id }) }
    ),

  // titles
  myTitles: () => apiFetch<UserTitle[]>("/api/titles/me"),
  allTitles: () => apiFetch<TitleCatalogEntry[]>("/api/titles/all"),
  patchTitle: (id: string, patch: { is_equipped?: boolean; is_displayed?: boolean }) =>
    apiFetch<UserTitle>(`/api/titles/${id}/equip`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    }),

  // persona / showcase
  generatePersona: (
    text: string,
    opts?: { character_type?: CharacterType; definition?: string }
  ) =>
    apiFetch<{ llm_output: string; character_type: string; used_definition: boolean }>(
      "/api/persona/generate",
      {
        method: "POST",
        body: JSON.stringify({
          text,
          character_type: opts?.character_type,
          definition: opts?.definition
        })
      }
    ),
  // 변환 결과(llm_output)는 미리 generatePersona 로 받은 값을 그대로 넘긴다.
  // 서버는 LLM 을 다시 돌리지 않고 받은 결과를 그대로 게시한다 — 미리 보기와
  // 게시 결과가 항상 일치하도록 보장.
  postShowcase: (text: string, llm_output: string) =>
    apiFetch<{ showcase_text: string; llm_output: string; used_definition: boolean }>(
      "/api/persona/showcase",
      { method: "POST", body: JSON.stringify({ text, llm_output }) }
    ),
  definePersona: (definition: string) =>
    apiFetch<{ persona_definition: string; persona_tokens: number }>(
      "/api/persona/define",
      { method: "POST", body: JSON.stringify({ definition }) }
    ),
  listShowcase: (q?: string) =>
    apiFetch<ShowcaseSummary[]>(
      `/api/showcase/recommendations${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),
  showcaseDetail: (user_id: string) =>
    apiFetch<ShowcaseDetail>(`/api/showcase/${user_id}`),

  // stats
  grass: (days = 365) =>
    apiFetch<Record<string, number>>(`/api/stats/grass?days=${days}`),
  series: (period: "week" | "month" | "year" = "week") =>
    apiFetch<SeriesPoint[]>(`/api/stats/series?period=${period}`),
  statsSummary: () => apiFetch<StatsSummary>("/api/stats/summary"),

  // summon (가챠·캐릭터 수집)
  summonInfo: () => apiFetch<SummonInfo>("/api/summon/info"),
  summonCollection: () =>
    apiFetch<{ catalog: GachaCharacter[]; owned: OwnedCharacter[] }>(
      "/api/summon/collection"
    ),
  summonDraw: (count: 1 | 10, cost_type: "POINTS" | "TICKET" = "POINTS") =>
    apiFetch<SummonResult>("/api/summon/draw", {
      method: "POST",
      body: JSON.stringify({ count, cost_type })
    }),
  summonEquip: (character_id: string) =>
    apiFetch<{ ok: true }>("/api/summon/equip", {
      method: "POST",
      body: JSON.stringify({ character_id })
    }),
  buyTickets: (count: number) =>
    apiFetch<{ tickets: number; remaining_points: number }>(
      "/api/summon/tickets/buy",
      { method: "POST", body: JSON.stringify({ count }) }
    ),

  // settings / account
  getSettings: () => apiFetch<Settings>("/api/settings"),
  patchSettings: (patch: Partial<Settings>) =>
    apiFetch<Settings>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(patch)
    }),
  exportData: () => apiFetch<Record<string, unknown>>("/api/me/export"),
  resetAccount: () => apiFetch<{ ok: true }>("/api/me/reset", { method: "POST" }),

  // web push
  vapidPublicKey: () => apiFetch<{ public_key: string }>("/api/notifications/vapid"),
  subscribePush: (sub: unknown) =>
    apiFetch<{ ok: true }>("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(sub)
    })
};
