"use client";

import { useState } from "react";
import { Sparkles, Send, Save, Coins, AlertCircle } from "lucide-react";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import ErrorBanner from "@/components/ErrorBanner";

export default function PersonaPage() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const pushToast = useAppStore((s) => s.pushToast);

  const tokens = user?.persona_tokens ?? 0;
  const definition = user?.persona_definition ?? "";
  const hasDefinition = definition.trim().length >= 10;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(definition);
  const [savingDef, setSavingDef] = useState(false);

  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");

  function startEdit() {
    setDraft(definition);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setErr("");
  }

  async function saveDefinition() {
    if (draft.trim().length < 10) {
      pushToast("error", "성격/역사는 최소 10자 이상으로 작성해 주세요.");
      return;
    }
    if (tokens < 1) {
      pushToast("error", "캐릭터 설정권이 없습니다. 상점에서 구매하세요.");
      return;
    }
    setSavingDef(true);
    setErr("");
    try {
      const res = await Api.definePersona(draft.trim());
      // refresh /me so HUD/store reflect new token count + definition
      const me = await Api.me();
      setUser(me);
      pushToast(
        "success",
        `캐릭터가 ${hasDefinition ? "변경" : "설정"}되었습니다. (남은 설정권: ${res.persona_tokens}장)`
      );
      setEditing(false);
    } catch (e) {
      setErr(humanizeError(e));
    } finally {
      setSavingDef(false);
    }
  }

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const res = await Api.generatePersona(text.trim());
      setOutput(res.llm_output);
      if (!res.used_definition) {
        pushToast("info", "아직 캐릭터가 설정되지 않아 기본 말투로 변환됐습니다.");
      }
    } catch (e) {
      setErr(humanizeError(e));
    } finally {
      setLoading(false);
    }
  }

  async function post() {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const res = await Api.postShowcase(text.trim());
      setOutput(res.llm_output);
      if (!res.used_definition) {
        pushToast(
          "info",
          "캐릭터 미설정 상태입니다 — 기본 말투로 게시되었습니다. 상점에서 캐릭터 설정권을 구매하세요."
        );
      } else {
        pushToast("success", "쇼케이스에 게시되었습니다.");
      }
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        페르소나 한마디
      </h1>
      <p className="text-sm text-text-2">
        ① 상점에서 <b>캐릭터 설정권</b>을 구매하고 캐릭터의 <b>성격과 역사</b>를 작성합니다.
        ② 하고 싶은 말을 입력하면 그 캐릭터의 말투로 변환됩니다.
      </p>

      {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}

      {/* ── Step 1: persona definition ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            ① 캐릭터 성격 설정
          </h2>
          <span className="text-xs text-text-2 flex items-center gap-1">
            <Coins className="h-3 w-3 text-gold" />
            보유 설정권 <b className="text-text-1">{tokens}</b>장
          </span>
        </div>

        {!editing && hasDefinition && (
          <div className="space-y-2">
            <div className="bg-surface-2 p-3 rounded text-sm whitespace-pre-wrap text-text-1">
              {definition}
            </div>
            <div className="flex justify-end">
              <button
                onClick={startEdit}
                disabled={tokens < 1}
                className="btn-ghost disabled:opacity-50 text-xs"
              >
                {tokens >= 1 ? "변경 (설정권 1장 소모)" : "변경하려면 설정권 필요"}
              </button>
            </div>
          </div>
        )}

        {!editing && !hasDefinition && (
          <div className="rounded border border-border bg-surface-2 p-3 text-sm text-text-2 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-gold flex-shrink-0" />
            <div>
              아직 캐릭터가 설정되지 않았습니다.{" "}
              {tokens >= 1 ? (
                <button
                  onClick={startEdit}
                  className="text-accent underline"
                >
                  지금 작성하기 (설정권 1장 소모)
                </button>
              ) : (
                <>상점에서 <b>캐릭터 설정권</b>을 먼저 구매하세요.</>
              )}
            </div>
          </div>
        )}

        {editing && (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="예: 30대 남성 기사. 어린 시절 마을이 용에게 습격당해 가족을 잃고 정의의 검술가가 되었다. 평소엔 격식 있는 고어체로 말하지만 분노하면 거친 평어가 튀어나온다."
              rows={6}
              maxLength={2000}
              className="input w-full"
            />
            <div className="flex items-center justify-between text-xs text-text-2">
              <span>{draft.length}/2000 (최소 10자)</span>
              <div className="flex gap-2">
                <button
                  onClick={cancelEdit}
                  className="btn-ghost"
                  disabled={savingDef}
                >
                  취소
                </button>
                <button
                  onClick={saveDefinition}
                  disabled={savingDef || draft.trim().length < 10 || tokens < 1}
                  className="btn-primary flex items-center gap-1 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingDef ? "저장 중..." : "설정권 사용해서 저장"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Step 2: voice transformation ── */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">② 하고 싶은 말 → 캐릭터 말투 변환</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예: 오늘은 정말 열심히 했다."
          rows={4}
          maxLength={300}
          className="input w-full"
        />
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-text-2 mr-auto">{text.length}/300</span>
          <button
            onClick={generate}
            disabled={loading || !text.trim()}
            className="btn-ghost disabled:opacity-50"
          >
            {loading ? "변환 중..." : "미리보기"}
          </button>
          <button
            onClick={post}
            disabled={posting || !text.trim()}
            className="btn-primary flex items-center gap-1 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {posting ? "게시 중..." : "쇼케이스 게시"}
          </button>
        </div>
      </div>

      {output && (
        <div className="card space-y-1">
          <h2 className="text-xs text-text-2">변환 결과</h2>
          <div className="text-text-1 whitespace-pre-wrap">{output}</div>
        </div>
      )}
    </div>
  );
}
