"use client";

import { useEffect, useState } from "react";
import { Check, Trash2, RotateCcw } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import type { Difficulty, Schedule } from "@/lib/types";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { ymdToDueIso } from "@/lib/date";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  /** YMD (YYYY-MM-DD) prefill for new schedule */
  dateYmd?: string;
  /** Prefill start hour (0-23, inclusive) — used only for new schedules */
  prefillStartHour?: number;
  /** Prefill end hour (0-23, exclusive: this is the hour AFTER the last covered row)
   *  e.g. prefillEndHour=7 means the end time field shows "07:00" */
  prefillEndHour?: number;
  /** existing schedule to edit */
  schedule?: Schedule | null;
  onSaved: () => void;
  onComplete?: (s: Schedule) => Promise<void> | void;
  onUncomplete?: (s: Schedule) => Promise<void> | void;
}

/** Convert a YYYY-MM-DD date string + "HH:MM" time string to an ISO 8601 string
 *  using the user's local timezone. Returns null if either is empty. */
function buildIso(dateYmd: string, timeHHMM: string): string | null {
  if (!dateYmd || !timeHHMM) return null;
  const [year, month, day] = dateYmd.split("-").map(Number);
  const [hour, minute] = timeHHMM.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

/** Extract "HH:MM" from an ISO string using local time. */
function isoToHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Format an hour number (0-23) as "HH:00". */
function hourToHHMM(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export default function ScheduleModal({
  open,
  onClose,
  dateYmd,
  prefillStartHour,
  prefillEndHour,
  schedule,
  onSaved,
  onComplete,
  onUncomplete
}: Props) {
  const t = useT();
  const pushToast = useAppStore((s) => s.pushToast);
  const isEdit = !!schedule;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
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
      // Populate time fields from the existing schedule if present.
      setStartTime(schedule.start_time ? isoToHHMM(schedule.start_time) : "");
      setEndTime(schedule.end_time ? isoToHHMM(schedule.end_time) : "");
    } else {
      setTitle("");
      setDescription("");
      setDifficulty("MEDIUM");
      setDueDate(dateYmd || "");
      // Prefill time from drag-select range if provided.
      setStartTime(prefillStartHour !== undefined ? hourToHHMM(prefillStartHour) : "");
      setEndTime(prefillEndHour !== undefined ? hourToHHMM(prefillEndHour) : "");
    }
  }, [open, schedule, dateYmd, prefillStartHour, prefillEndHour]);

  async function onSave() {
    if (!title.trim()) {
      pushToast("error", t("calendar.errTitleRequired"));
      return;
    }
    if (!dueDate) {
      pushToast("error", t("calendar.errDateRequired"));
      return;
    }
    setBusy(true);
    try {
      // Build ISO strings for start/end times using the chosen due date.
      // If the user left a time field empty, send null (date-only schedule).
      const start_time = buildIso(dueDate, startTime) ?? null;
      const end_time = buildIso(dueDate, endTime) ?? null;

      if (isEdit && schedule) {
        await Api.patchSchedule(schedule.id, {
          title: title.trim(),
          description: description.trim(),
          difficulty,
          due_date: ymdToDueIso(dueDate),
          start_time,
          end_time
        });
        pushToast("success", t("calendar.toastUpdated"));
      } else {
        await Api.createSchedule({
          title: title.trim(),
          description: description.trim() || undefined,
          difficulty,
          due_date: ymdToDueIso(dueDate),
          start_time,
          end_time
        });
        pushToast("success", t("calendar.toastCreated"));
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

  async function onUncompleteClick() {
    if (!schedule || !onUncomplete) return;
    setBusy(true);
    try {
      await onUncomplete(schedule);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!schedule) return;
    if (!confirm(t("calendar.confirmDelete"))) return;
    setBusy(true);
    try {
      await Api.deleteSchedule(schedule.id);
      pushToast("success", t("calendar.toastDeleted"));
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
      title={isEdit ? t("calendar.editSchedule") : t("calendar.newSchedule")}
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
              {t("calendar.delete")}
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
              {t("calendar.complete")}
            </Button>
          )}
          {isEdit && schedule?.status === "COMPLETED" && onUncomplete && (
            <Button
              variant="ghost"
              size="md"
              onClick={onUncompleteClick}
              loading={busy}
              leading={<RotateCcw className="h-4 w-4" />}
            >
              {t("calendar.cancelComplete")}
            </Button>
          )}
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>
            {t("calendar.cancel")}
          </Button>
          <Button variant="primary" size="md" onClick={onSave} loading={busy}>
            {t("calendar.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-text-2">{t("calendar.title")}</label>
          <input
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("calendar.titlePlaceholder")}
            maxLength={200}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-2">{t("calendar.descriptionOptional")}</label>
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
            <label className="text-xs text-text-2">{t("calendar.difficulty")}</label>
            <select
              className="input w-full"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="LOW">{t("calendar.difficultyLowOption")}</option>
              <option value="MEDIUM">{t("calendar.difficultyMediumOption")}</option>
              <option value="HIGH">{t("calendar.difficultyHighOption")}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-2">{t("calendar.dueDate")}</label>
            <input
              type="date"
              className="input w-full"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-text-2">{t("calendar.startTime")}</label>
            <input
              type="time"
              className="input w-full"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-2">{t("calendar.endTime")}</label>
            <input
              type="time"
              className="input w-full"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
