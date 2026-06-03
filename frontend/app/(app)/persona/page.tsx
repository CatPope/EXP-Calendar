"use client";

import { useState } from "react";
import { Sparkles, Send, Save, Coins, AlertCircle } from "lucide-react";
import { Api, humanizeError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import ErrorBanner from "@/components/ErrorBanner";

export default function PersonaPage() {
  const t = useT();
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
      pushToast("error", t("character.defMinLength"));
      return;
    }
    if (tokens < 1) {
      pushToast("error", t("character.noToken"));
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
        hasDefinition
          ? t("character.saveSuccessChanged", { n: res.persona_tokens })
          : t("character.saveSuccessSet", { n: res.persona_tokens })
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
        pushToast("info", t("character.genDefaultVoice"));
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
        pushToast("info", t("character.postDefaultVoice"));
      } else {
        pushToast("success", t("character.postSuccess"));
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
        {t("character.personaTitle")}
      </h1>
      <p className="text-sm text-text-2">{t("character.personaIntro")}</p>

      {err && <ErrorBanner message={err} onDismiss={() => setErr("")} />}

      {/* ── Step 1: persona definition ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            {t("character.step1Title")}
          </h2>
          <span className="text-xs text-text-2 flex items-center gap-1">
            <Coins className="h-3 w-3 text-gold" />
            {t("character.ownedTokenPrefix")}{" "}
            <b className="text-text-1">{tokens}</b>
            {t("character.ownedTokenSuffix")}
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
                {tokens >= 1
                  ? t("character.changeWithToken")
                  : t("character.changeNeedsToken")}
              </button>
            </div>
          </div>
        )}

        {!editing && !hasDefinition && (
          <div className="rounded border border-border bg-surface-2 p-3 text-sm text-text-2 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-gold flex-shrink-0" />
            <div>
              {t("character.notSetYet")}{" "}
              {tokens >= 1 ? (
                <button
                  onClick={startEdit}
                  className="text-accent underline"
                >
                  {t("character.writeNow")}
                </button>
              ) : (
                <>
                  {t("character.buyFirstPre")}
                  <b>{t("character.personaIntroBuy")}</b>
                  {t("character.buyFirstPost")}
                </>
              )}
            </div>
          </div>
        )}

        {editing && (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("character.defPlaceholder")}
              rows={6}
              maxLength={2000}
              className="input w-full"
            />
            <div className="flex items-center justify-between text-xs text-text-2">
              <span>{t("character.charCounter", { n: draft.length })}</span>
              <div className="flex gap-2">
                <button
                  onClick={cancelEdit}
                  className="btn-ghost"
                  disabled={savingDef}
                >
                  {t("character.cancel")}
                </button>
                <button
                  onClick={saveDefinition}
                  disabled={savingDef || draft.trim().length < 10 || tokens < 1}
                  className="btn-primary flex items-center gap-1 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingDef ? t("character.saving") : t("character.saveWithToken")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Step 2: voice transformation ── */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">{t("character.step2Title")}</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("character.voicePlaceholder")}
          rows={4}
          maxLength={300}
          className="input w-full"
        />
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-text-2 mr-auto">{t("character.voiceCounter", { n: text.length })}</span>
          <button
            onClick={generate}
            disabled={loading || !text.trim()}
            className="btn-ghost disabled:opacity-50"
          >
            {loading ? t("character.generating") : t("character.preview")}
          </button>
          <button
            onClick={post}
            disabled={posting || !text.trim()}
            className="btn-primary flex items-center gap-1 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {posting ? t("character.posting") : t("character.postShowcase")}
          </button>
        </div>
      </div>

      {output && (
        <div className="card space-y-1">
          <h2 className="text-xs text-text-2">{t("character.resultTitle")}</h2>
          <div className="text-text-1 whitespace-pre-wrap">{output}</div>
        </div>
      )}
    </div>
  );
}
