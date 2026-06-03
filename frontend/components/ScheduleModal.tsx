"use client";

import { useEffect, useState } from "react";
import { X, Trash2, CheckCircle2 } from "lucide-react";
import type { Difficulty, Schedule } from "@/lib/types";
import DifficultyBadge from "./DifficultyBadge";

interface Props {
  open: boolean;
  ymd: string;
  existing: Schedule[];
  onClose: () => void;
  onCreate: (input: { title: string; description: string; difficulty: Difficulty; due_date: string }) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ScheduleModal({ open, ymd, existing, onClose, onCreate, onComplete, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setDifficulty("MEDIUM");
    }
  }, [open, ymd]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const due = new Date(ymd + "T23:59:00");
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        difficulty,
        due_date: due.toISOString()
      });
      setTitle("");
      setDescription("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-lg">{ymd} 일정</h2>
          <button onClick={onClose} className="text-text-2 hover:text-text-1" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {existing.length === 0 ? (
            <div className="text-sm text-text-2">등록된 일정이 없습니다.</div>
          ) : (
            existing.map((s) => (
              <div key={s.id} className="card !p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DifficultyBadge difficulty={s.difficulty} />
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        s.status === "COMPLETED"
                          ? "bg-success/20 text-success"
                          : s.status === "OVERDUE"
                          ? "bg-danger/20 text-danger"
                          : "bg-accent/20 text-accent"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className={`mt-1 font-medium ${s.status === "COMPLETED" ? "line-through text-text-2" : ""}`}>
                    {s.title}
                  </div>
                  {s.description && (
                    <div className="text-xs text-text-2 mt-0.5 whitespace-pre-wrap">{s.description}</div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {s.status === "PENDING" && (
                    <button
                      onClick={() => onComplete(s.id)}
                      className="btn-success flex items-center gap-1"
                      aria-label="완료"
                    >
                      <CheckCircle2 className="h-4 w-4" /> 완료
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(s.id)}
                    className="btn-ghost flex items-center gap-1 text-danger"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" /> 삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={submit} className="p-4 border-t border-border space-y-3">
          <h3 className="text-sm font-semibold">새 일정 추가</h3>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="input w-full"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명 (선택)"
            rows={2}
            className="input w-full"
          />
          <div className="flex items-center gap-2">
            {(["LOW", "MEDIUM", "HIGH"] as Difficulty[]).map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setDifficulty(d)}
                className={`btn ${difficulty === d ? "bg-accent text-white" : "bg-surface-2 text-text-2"}`}
              >
                {d === "LOW" ? "쉬움" : d === "MEDIUM" ? "보통" : "어려움"}
              </button>
            ))}
            <button type="submit" disabled={busy || !title.trim()} className="btn-primary ml-auto disabled:opacity-50">
              {busy ? "저장 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
