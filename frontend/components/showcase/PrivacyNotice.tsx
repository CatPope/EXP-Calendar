import { Lock } from "lucide-react";

// 🔒 비공개 항목 안내 — uxui_12 정합.
export default function PrivacyNotice() {
  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-gold">
        <Lock className="h-4 w-4" />
        비공개 항목
      </div>
      <p className="text-xs leading-relaxed text-text-2">
        다른 유저의{" "}
        <span className="text-danger">상세 일정 · 실패율 · 미완료 목록</span>은 공개되지 않습니다.
        (캐릭터 · 칭호 · 잔디 · 등급만 노출)
      </p>
    </div>
  );
}
