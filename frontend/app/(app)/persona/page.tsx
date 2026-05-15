"use client";

import { useEffect, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { apiFetch, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { CharacterType } from "@/lib/types";
import ErrorBanner from "@/components/ErrorBanner";
import Loading from "@/components/Loading";

const CHARS: { value: CharacterType; label: string }[] = [
  { value: "default", label: "기본" },
  { value: "tsundere", label: "츤데레" },
  { value: "knight", label: "용감한 기사" }
];

export default function PersonaPage() {
  const user = useAppStore((s) => s.user);
  const pushToast = useAppStore((s) => s.pushToast);
  const [text, setText] = useState("");
  const [character, setCharacter] = useState<CharacterType>("default");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user?.persona_character_type) {
      setCharacter(user.persona_character_type as CharacterType);
    }
  }, [user?.persona_character_type]);

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const res = await apiFetch<{ llm_output: string; character_type: string }>(
        "/api/persona/generate",
        {
          method: "POST",
          body: JSON.stringify({ text: text.trim(), character_type: character })
        }
      );
      setOutput(res.llm_output);
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
      const res = await apiFetch<{ showcase_text: string; llm_output: string }>(
        "/api/persona/showcase",
        { method: "POST", body: JSON.stringify({ text: text.trim() }) }
      );
      setOutput(res.llm_output);
      pushToast("success", "쇼케이스에 게시되었습니다.");
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
        하고 싶은 말을 입력하면 선택한 캐릭터의 말투로 변환합니다. 마음에 들면 쇼케이스에 게시할 수 있습니다.
      </p>

      {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}

      <div className="card space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-2">캐릭터:</span>
          {CHARS.map((c) => (
            <button
              key={c.value}
              onClick={() => setCharacter(c.value)}
              className={`btn ${
                character === c.value ? "bg-accent text-white" : "bg-surface-2 text-text-2"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
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
            {loading ? <Loading label="변환 중..." /> : "미리보기"}
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
