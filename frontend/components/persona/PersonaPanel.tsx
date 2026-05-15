"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import type { CharacterType } from "@/lib/types";
import Button from "@/components/common/Button";
import Spinner from "@/components/common/Spinner";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { CHARACTER_LABEL } from "@/lib/game";

export default function PersonaPanel() {
  const [text, setText] = useState("");
  const [characterType, setCharacterType] = useState<CharacterType>("default");
  const [output, setOutput] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);

  const pushToast = useAppStore((s) => s.pushToast);

  async function onGenerate() {
    if (!text.trim()) {
      pushToast("error", "변환할 텍스트를 입력해 주세요.");
      return;
    }
    setGenerating(true);
    setOutput("");
    try {
      const res = await Api.generatePersona(text.trim(), characterType);
      setOutput(res.llm_output);
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setGenerating(false);
    }
  }

  async function onPost() {
    if (!text.trim()) {
      pushToast("error", "먼저 텍스트를 입력하고 변환해 주세요.");
      return;
    }
    setPosting(true);
    try {
      await Api.postShowcase(text.trim());
      pushToast("success", "쇼케이스에 게시했습니다.");
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="font-semibold">페르소나 변환기</h2>
        </div>
        <p className="text-xs text-text-2 leading-relaxed">
          입력한 텍스트를 선택한 캐릭터의 말투로 변환합니다. 변환된 결과를 쇼케이스에 게시할 수
          있습니다.
        </p>
        <div className="space-y-2">
          <label className="text-xs text-text-2">캐릭터 타입</label>
          <select
            value={characterType}
            onChange={(e) => setCharacterType(e.target.value as CharacterType)}
            className="input w-full"
          >
            {(Object.keys(CHARACTER_LABEL) as CharacterType[]).map((k) => (
              <option key={k} value={k}>
                {CHARACTER_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-text-2">원문</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={1000}
            className="input w-full"
            placeholder="예: 오늘 알고리즘 3문제 풀었다. 보람차다."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={onGenerate}
            loading={generating}
            leading={<Sparkles className="h-4 w-4" />}
          >
            변환
          </Button>
          <Button
            variant="gold"
            onClick={onPost}
            loading={posting}
            disabled={!text.trim()}
            leading={<Send className="h-4 w-4" />}
          >
            쇼케이스에 게시
          </Button>
        </div>
      </div>

      <div className="card space-y-2 min-h-[120px]">
        <div className="text-xs text-text-2">변환 결과</div>
        {generating ? (
          <Spinner block label="LLM 변환 중..." />
        ) : output ? (
          <p className="whitespace-pre-line text-sm leading-relaxed">{output}</p>
        ) : (
          <p className="text-sm text-text-2">아직 결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
