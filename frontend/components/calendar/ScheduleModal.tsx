"use client";

import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import type { Difficulty, Schedule } from "@/lib/types";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { ymdToDueIso } from "@/lib/date";

interface Props {
  open: boolean;
  onClose: () => void;
  /** YMD (YYYY-MM-DD) prefill for new schedule */
  dateYmd?: string;
  /** existing schedule to edit */
  schedule?: Schedule | null;
  onSaved: () => void;
  onComplete?: (s: Schedule) => Promise<void> | void;
}

export default function ScheduleModal({
  open,
  onClose,
  dateYmd,
  schedule,
  onSaved,
  onComplete
}: Props) {
  const pushToast = useAppStore((s) => s.pushToast);
  const isEdit = !!schedule;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (schedule) {
      setTitle(schedule.title);
      setDescription(schedule.description || "");
      setDifficulty(schedule.difficulty);
      const d = new Date(schedule.due_date);
      setDueDate(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`
      );
    } else {
      setTitle("");
      setDescription("");
      setDifficulty("MEDIUM");
      setDueDate(dateYmd || "");
    }
  }, [open, schedule, dateYmd]);

  async function onSave() {
    if (!title.trim()) {
      pushToast("error", "제목을 입력해 주세요.");
      return;
    }
    if (!dueDate) {
      pushToast("error", "날짜를 선택해 주세요.");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && schedule) {
        await Api.patchSchedule(schedule.id, {
          title: title.trim(),
          description: description.trim(),
          difficulty,
          due_date: ymdToDueIso(dueDate)
        });
        pushToast("success", "일정을 수정했습니다.");
      } else {
        await Api.createSchedule({
          title: title.trim(),
          description: description.trim() || undefined,
          difficulty,
          due_date: ymdToDueIso(dueDate)
        });
        pushToast("success", "일정을 추가했습니다.");
      }
      onSaved();
      onClose();
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function onCompleteClick() {
    if (!schedule || !onComplete) return;
    setBusy(true);
    try {
      await onComplete(schedule);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!schedule) return;
    if (!confirm("이 일정을 삭제할까요?")) return;
    setBusy(true);
    try {
      await Api.deleteSchedule(schedule.id);
      pushToast("success", "일정을 삭제했습니다.");
      onSaved();
      onClose();
    } catch (e) {
      pushToast("error", humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "일정 수정" : "새 일정"}
      footer={
        <>
          {isEdit && (
            <Button
              variant="danger"
              size="sm"
              onClick={onDelete}
              loading={busy}
              leading={<Trash2 className="h-3 w-3" />}
            >
              삭제
            </Button>
          )}
          {isEdit && schedule?.status !== "COMPLETED" && onComplete && (
            <Button
              variant="success"
              size="md"
              onClick={onCompleteClick}
              loading={busy}
              leading={<Check className="h-4 w-4" />}
            >
              완료
            </Button>
          )}
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button variant="primary" size="md" onClick={onSave} loading={busy}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-text-2">제목</label>
          <input
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 알고리즘 문제 풀기"
            maxLength={200}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-2">설명 (선택)</label>
          <textarea
            className="input w-full"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-text-2">난이도</label>
            <select
              className="input w-full"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="LOW">쉬움 (LOW)</option>
              <option value="MEDIUM">보통 (MEDIUM)</option>
              <option value="HIGH">어려움 (HIGH)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-2">마감일</label>
            <input
              type="date"
              className="input w-full"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
