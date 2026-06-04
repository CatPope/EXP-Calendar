// 브라우저 Web Push 구독 (FR-NOTI-01/02). 서비스워커(worker/index.js, next-pwa가
// 컴파일)의 push 이벤트가 알림을 표시한다. dev(NODE_ENV=development)에서는 next-pwa가
// 비활성이라 SW가 없어 unsupported를 반환할 수 있다 — 프로덕션 빌드에서 동작.

import { Api } from "./api";

export type PushResult =
  | "granted"
  | "denied"
  | "unsupported"
  | "no-sw"
  | "error";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** 권한 요청 → VAPID 공개키로 구독 → 백엔드에 등록. 결과 상태를 반환. */
export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return "no-sw"; // next-pwa SW 미등록(dev) — 프로덕션 빌드 필요

    const { public_key } = await Api.vapidPublicKey();
    if (!public_key) return "error";

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key) as BufferSource
      });
    }
    await Api.subscribePush(sub.toJSON());
    return "granted";
  } catch {
    return "error";
  }
}
