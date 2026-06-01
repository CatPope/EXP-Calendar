"use client";

import { useMemo, useState } from "react";
import { Sparkles, Pencil, Save, Undo2, Send, Diamond } from "lucide-react";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { skinById, skinFromLevel, type SkinId } from "@/lib/character";
import CharacterAvatar from "@/components/CharacterAvatar";
import ErrorBanner from "@/components/ErrorBanner";
import Spinner from "@/components/common/Spinner";

// ── Persona definition encoding ──────────────────────────────────────────────
// 네 필드(이름/말투·성격/역사·배경/자주 하는 생각)를 단일 문자열로 합성해
// Api.definePersona(definition) 로 저장한다. JSON 으로 직렬화해 라운드트립을 보장하고,
// 과거(JSON 이전) 자유 텍스트 정의는 역사·배경 필드로 흡수한다.
const FORM_MARKER = "__exp_persona_v1__";

interface PersonaForm {
  name: string;
  tone: string;
  history: string;
  thoughts: string;
}

const EMPTY_FORM: PersonaForm = { name: "", tone: "", history: "", thoughts: "" };

const LIMITS = { name: 16, tone: 60, history: 300, thoughts: 200 } as const;

function parseDefinition(raw: string): PersonaForm {
  const text = (raw ?? "").trim();
  if (!text) return { ...EMPTY_FORM };
  try {
    const obj = JSON.parse(text) as Partial<PersonaForm> & { _marker?: string };
    if (obj && obj._marker === FORM_MARKER) {
      return {
        name: (obj.name ?? "").slice(0, LIMITS.name),
        tone: (obj.tone ?? "").slice(0, LIMITS.tone),
        history: (obj.history ?? "").slice(0, LIMITS.history),
        thoughts: (obj.thoughts ?? "").slice(0, LIMITS.thoughts),
      };
    }
  } catch {
    /* not JSON — legacy free text */
  }
  // 레거시 자유 텍스트는 역사·배경으로 흡수
  return { ...EMPTY_FORM, history: text.slice(0, LIMITS.history) };
}

function encodeDefinition(form: PersonaForm): string {
  return JSON.stringify({
    _marker: FORM_MARKER,
    name: form.name.trim(),
    tone: form.tone.trim(),
    history: form.history.trim(),
    thoughts: form.thoughts.trim(),
  });
}

function skinLabel(skinId: string, level: number): string {
  if (skinId && skinById(skinId as SkinId).id === (skinId as SkinId)) {
    return skinById(skinId as SkinId).label;
  }
  return skinFromLevel(level).label;
}

// ── Counter helpers ───────────────────────────────────────────────────────────
function Field({
  label,
  helper,
  value,
  max,
  children,
}: {
  label: string;
  helper: string;
  value: string;
  max: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-text-1">{label}</label>
        <span className="text-xs tabular-nums text-text-2">
          {value.length}/{max}
        </span>
      </div>
      <p className="text-xs text-text-2">{helper}</p>
      {children}
    </div>
  );
}

export default function PersonaPage() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const patchUser = useAppStore((s) => s.patchUser);
  const pushToast = useAppStore((s) => s.pushToast);

  const tokens = user?.persona_tokens ?? 0;
  const savedDefinition = user?.persona_definition ?? "";

  // 마지막 저장본 (되돌리기 기준)
  const saved = useMemo(() => parseDefinition(savedDefinition), [savedDefinition]);

  const [form, setForm] = useState<PersonaForm>(saved);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // ── 기존 기능: 미리보기/쇼케이스 게시 ──
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [posting, setPosting] = useState(false);

  const displayName = (form.name.trim() || user?.display_name || "픽셀용사").trim();
  const level = user?.level ?? 1;
  const skin = user?.character_skin ?? "";
  const outline = skinLabel(skin, level);

  const dirty =
    form.name !== saved.name ||
    form.tone !== saved.tone ||
    form.history !== saved.history ||
    form.thoughts !== saved.thoughts;

  function set<K extends keyof PersonaForm>(key: K, raw: string) {
    setForm((f) => ({ ...f, [key]: raw.slice(0, LIMITS[key]) }));
  }

  function revert() {
    setForm(saved);
    setErr("");
  }

  async function save() {
    const composed = encodeDefinition(form);
    setSaving(true);
    setErr("");
    try {
      const res = await Api.definePersona(composed);
      patchUser({
        persona_definition: res.persona_definition ?? composed,
        persona_tokens: res.persona_tokens,
      });
      pushToast("success", "페르소나가 저장되었습니다.");
    } catch (e) {
      setErr(humanizeError(e));
    } finally {
      setSaving(false);
    }
  }

  async function preview() {
    if (!text.trim()) return;
    setPreviewing(true);
    setErr("");
    try {
      const res = await Api.generatePersona(text.trim());
      setOutput(res.llm_output);
      if (!res.used_definition) {
        pushToast("info", "아직 페르소나가 저장되지 않아 기본 말투로 변환됐습니다.");
      }
    } catch (e) {
      setErr(humanizeError(e));
    } finally {
      setPreviewing(false);
    }
  }

  async function post() {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const res = await Api.postShowcase(text.trim());
      setOutput(res.llm_output);
      if (!res.used_definition) {
        pushToast("info", "페르소나 미설정 상태 — 기본 말투로 게시되었습니다.");
      } else {
        pushToast("success", "쇼케이스에 게시되었습니다.");
      }
      // 게시로 인해 /me 가 바뀔 수 있어 동기화
      try {
        const me = await Api.me();
        setUser(me);
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* ── Header ── */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          페르소나
        </h1>
        <p className="text-sm text-text-2">
          캐릭터의 성격을 직접 만듭니다 · 이름 · 역사 · 자주 하는 생각 등을 설정 (이 캐릭터에 귀속)
        </p>
      </div>

      {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}

      {/* ── 귀속 캐릭터 카드 ── */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-text-1">
          이 페르소나가 귀속된 캐릭터
          <Diamond className="h-3.5 w-3.5 text-accent" />
        </h2>
        <div className="flex items-center gap-4">
          <CharacterAvatar
            level={level}
            skin={skin ? (skin as SkinId) : undefined}
            size={56}
            animated={false}
          />
          <div className="min-w-0">
            <div className="text-base font-semibold text-text-1 truncate">{displayName}</div>
            <p className="text-xs text-text-2">
              외형: {outline} · 성격 설정은 <b className="text-text-1">이 캐릭터에만</b> 적용·귀속됩니다
            </p>
          </div>
        </div>
      </div>

      {/* ── 성격 만들기 폼 ── */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-text-1">
          성격 만들기
          <Pencil className="h-3.5 w-3.5 text-accent" />
        </h2>

        <Field
          label="이름"
          helper="캐릭터 이름 (HUD·쇼케이스에 표시됩니다)"
          value={form.name}
          max={LIMITS.name}
        >
          <input
            type="text"
            value={form.name}
            maxLength={LIMITS.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="픽셀용사"
            className="input w-full"
          />
        </Field>

        <Field
          label="말투 · 성격"
          helper="한 줄로 성격/말투를 요약합니다 (페르소나 톤의 핵심)"
          value={form.tone}
          max={LIMITS.tone}
        >
          <input
            type="text"
            value={form.tone}
            maxLength={LIMITS.tone}
            onChange={(e) => set("tone", e.target.value)}
            placeholder="겉으론 퉁명스럽지만 속은 다정한 츤데레"
            className="input w-full"
          />
        </Field>

        <Field
          label="역사 · 배경"
          helper="캐릭터의 서사/설정. 페르소나가 말할 때 참고됩니다."
          value={form.history}
          max={LIMITS.history}
        >
          <textarea
            value={form.history}
            maxLength={LIMITS.history}
            onChange={(e) => set("history", e.target.value)}
            placeholder="게으름의 던전에서 태어나 매일 퀘스트를 깨며 성장하는 모험가. 작은 성공을 모아 언젠가 전설이 되는 것이 목표다."
            rows={3}
            className="input w-full resize-y"
          />
        </Field>

        <Field
          label="자주 하는 생각"
          helper="평소 떠올리는 생각/말버릇. 상태 메시지 톤에 반영됩니다."
          value={form.thoughts}
          max={LIMITS.thoughts}
        >
          <textarea
            value={form.thoughts}
            maxLength={LIMITS.thoughts}
            onChange={(e) => set("thoughts", e.target.value)}
            placeholder="오늘 할 일만 끝내면 분명 뿌듯할 텐데… 조금만 더 누워있을까?"
            rows={3}
            className="input w-full resize-y"
          />
        </Field>

        {/* Footer */}
        <div className="border-t border-border pt-3 flex items-center justify-end gap-2">
          <button
            onClick={revert}
            disabled={saving || !dirty}
            className="btn-ghost flex items-center gap-1.5 disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />
            되돌리기
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Spinner size={14} /> : <Save className="h-4 w-4" />}
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>

        <p className="text-xs text-text-2">
          ※ 상태 메시지(대사)는 [통계·등급]의 내 캐릭터 창에서 수정합니다.
        </p>
      </div>

      {/* ── 보조 기능: 한마디 → 캐릭터 말투 변환 / 쇼케이스 게시 ── */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-text-1">
          <Send className="h-3.5 w-3.5 text-accent" />
          한마디 → 캐릭터 말투 변환
        </h2>
        <p className="text-xs text-text-2">
          하고 싶은 말을 입력하면 위에서 만든 페르소나 말투로 변환해 미리보거나 쇼케이스에 게시합니다.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예: 오늘은 정말 열심히 했다."
          rows={3}
          maxLength={300}
          className="input w-full resize-y"
        />
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-text-2 mr-auto tabular-nums">{text.length}/300</span>
          <button
            onClick={preview}
            disabled={previewing || !text.trim()}
            className="btn-ghost disabled:opacity-50"
          >
            {previewing ? "변환 중..." : "미리보기"}
          </button>
          <button
            onClick={post}
            disabled={posting || !text.trim()}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {posting ? "게시 중..." : "쇼케이스 게시"}
          </button>
        </div>
        {output && (
          <div className="bg-surface-2 rounded p-3 space-y-1">
            <div className="text-xs text-text-2">변환 결과</div>
            <div className="text-text-1 whitespace-pre-wrap">{output}</div>
          </div>
        )}
        {tokens > 0 && (
          <div className="text-xs text-text-2 text-right">
            보유 설정권 <b className="text-text-1">{tokens}</b>장
          </div>
        )}
      </div>
    </div>
  );
}
