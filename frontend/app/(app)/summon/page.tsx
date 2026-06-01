"use client";

// 소환 / 가챠 (uxui_06 상단 + uxui_07 하단) — 단일 스크롤 페이지.
// 백엔드 가챠 엔드포인트 부재 → 전 과정 프론트 mock. 포인트 차감/도감 보유 상태는
// React 상태 + localStorage("exp-calendar.summon")로만 관리한다.

import { useMemo, useState } from "react";
import { Sparkles, Crown, Lock, Info } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { GRADE_TEXT, gradeLabel, type GradeKey } from "@/lib/game";
import {
  RATES,
  PITY,
  COST_SINGLE,
  COST_TEN,
  PICKUP_ID,
  CATALOG,
  buildInitialDex,
  loadSummonState,
  saveSummonState,
  roll,
  roll10,
  pickLegendary,
} from "@/lib/summon";
import type { SummonCharacter, SummonOutcome } from "@/lib/types";
import PixelTile from "@/components/summon/PixelTile";
import GradeBadge from "@/components/summon/GradeBadge";

export default function SummonPage() {
  const user = useAppStore((s) => s.user);
  const patchUser = useAppStore((s) => s.patchUser);
  const pushToast = useAppStore((s) => s.pushToast);

  // 도감 + 천장 카운터 — localStorage 머지로 초기화 (한 번만)
  const [dex, setDex] = useState<SummonCharacter[]>(() => buildInitialDex());
  const [pity, setPity] = useState<number>(() => loadSummonState()?.pity ?? 0);
  const [results, setResults] = useState<SummonOutcome[]>([]);

  const pickup = useMemo(() => CATALOG.find((c) => c.id === PICKUP_ID)!, []);
  const ownedCount = dex.filter((c) => c.owned).length;
  const points = user?.current_points ?? 0;
  // 소환권: 소프트 재화 파생값 (포인트 100당 1매, mock).
  const tickets = Math.floor(points / COST_SINGLE);

  function persist(nextDex: SummonCharacter[], nextPity: number) {
    saveSummonState({
      owned: nextDex.filter((c) => c.owned).map((c) => c.id),
      equipped: nextDex.find((c) => c.equipped)?.id ?? null,
      pity: nextPity,
    });
  }

  /** 뽑힌 결과를 도감/천장에 반영. */
  function applyOutcomes(outcomes: SummonOutcome[]) {
    let p = pity;
    const owns = new Set(dex.filter((c) => c.owned).map((c) => c.id));
    for (const o of outcomes) {
      owns.add(o.character.id);
      if (o.character.grade === "LEGENDARY") p = 0;
      else p += 1;
    }
    const nextDex = dex.map((c) => (owns.has(c.id) ? { ...c, owned: true } : c));
    setDex(nextDex);
    setPity(p);
    persist(nextDex, p);
  }

  function summon(count: 1 | 10) {
    const cost = count === 1 ? COST_SINGLE : COST_TEN;
    if (points < cost) {
      pushToast("error", `포인트가 부족합니다 (필요 ${cost}P · 보유 ${points}P)`);
      return;
    }
    // 포인트 차감 (mock — 백엔드 호출 없음)
    patchUser({ current_points: points - cost });

    let outcomes: SummonOutcome[];
    if (count === 1) {
      // 천장: 90회 미획득 시 LEGENDARY 확정
      const forced = pity >= PITY;
      outcomes = [forced ? pickLegendary() : roll()];
    } else {
      outcomes = roll10();
      // 10연차 도중 천장 도달분 보정: 누적 90 넘으면 LEGENDARY 확정 1개 보장
      const willHaveLegend = outcomes.some((o) => o.character.grade === "LEGENDARY");
      if (!willHaveLegend && pity + 10 >= PITY) {
        outcomes[outcomes.length - 1] = pickLegendary();
      }
    }

    // isNew 판정을 현재 도감 기준으로 재계산 (CATALOG 기본 owned 와 어긋남 방지)
    const ownedIds = new Set(dex.filter((c) => c.owned).map((c) => c.id));
    outcomes = outcomes.map((o) => ({
      character: o.character,
      isNew: !ownedIds.has(o.character.id),
    }));

    applyOutcomes(outcomes);
    setResults(outcomes);

    const best = outcomes
      .slice()
      .sort(
        (a, b) =>
          gradeWeight(b.character.grade) - gradeWeight(a.character.grade)
      )[0];
    if (best.character.grade === "LEGENDARY") {
      pushToast("success", `★ 전설 등장! ${best.character.name} 획득!`);
    } else {
      pushToast("info", `소환 완료 · 최고 등급 ${gradeLabel(best.character.grade)}`);
    }
  }

  function equip(id: string) {
    const nextDex = dex.map((c) => ({ ...c, equipped: c.id === id }));
    setDex(nextDex);
    persist(nextDex, pity);
    const c = nextDex.find((x) => x.id === id);
    pushToast("success", `${c?.name} 장착 완료`);
  }

  return (
    <div className="space-y-4">
      {/* ── 헤더 (uxui_06) ── */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">픽셀용사 소환</h1>
          <p className="text-text-2 text-sm">
            동반자는 종류가 다양해요 · 소환(뽑기)으로 새 캐릭터를 획득하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-gold px-3 py-1 text-sm font-semibold text-gold">
            ◎ {points.toLocaleString()} P
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-accent px-3 py-1 text-sm font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" /> 소환권 {tickets}
          </span>
        </div>
      </header>

      {/* ── 상단: PICK-UP (좌) + 결과/확률 (우) ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* PICK-UP 픽업 소환 */}
        <section className="card border-gold space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-2">PICK-UP ◎ 픽업 소환</h2>
          </div>
          <p className="text-center text-sm font-semibold text-gold">
            ★ 픽업 LEGENDARY 확률 2배 ★
          </p>

          <div className="flex flex-col items-center gap-3">
            <PixelTile grade={pickup.grade} size={140} />
            <GradeBadge grade={pickup.grade} />
            <div className="text-center">
              <div className="text-lg font-bold">{pickup.name}</div>
              <div className="text-text-2 text-xs">전설의 소환수</div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-ghost" onClick={() => summon(1)}>
                단차 ({COST_SINGLE}P)
              </button>
              <button className="btn-primary" onClick={() => summon(10)}>
                10연차 ({COST_TEN}P)
              </button>
            </div>
            <p className="text-text-2 mt-2 text-center text-xs">
              10연차 시 RARE 이상 1개 확정
            </p>
          </div>
        </section>

        {/* 우측 컬럼: 소환 결과 + 확률 정보 */}
        <div className="space-y-4">
          {/* 소환 결과 */}
          <section className="card space-y-3">
            <h2 className="flex items-center gap-1 text-sm font-semibold text-text-2">
              소환 결과 <Sparkles className="h-3.5 w-3.5 text-accent" />
            </h2>
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Sparkles className="h-8 w-8 text-text-2" />
                <p className="text-text-2 text-sm">
                  소환 버튼을 눌러 새 동반자를 만나보세요!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {results.map((o, i) => (
                  <div
                    key={`${o.character.id}-${i}`}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="relative">
                      <PixelTile grade={o.character.grade} size={64} />
                      {o.isNew && (
                        <span className="absolute -right-1 -top-1 rounded bg-success px-1 text-[10px] font-bold text-base">
                          NEW
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
                        GRADE_TEXT[o.character.grade as GradeKey]
                      }`}
                    >
                      {gradeLabel(o.character.grade)}
                    </span>
                    <span className="truncate text-[11px]" title={o.character.name}>
                      {o.character.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 확률 정보 */}
          <section className="card space-y-2">
            <h2 className="flex items-center gap-1 text-sm font-semibold text-text-2">
              확률 정보 <Info className="h-3.5 w-3.5" />
            </h2>
            <ul className="space-y-1.5">
              {RATES.map((r) => (
                <li
                  key={r.grade}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-1.5"
                >
                  <GradeBadge grade={r.grade} />
                  <span
                    className={`text-sm font-bold ${GRADE_TEXT[r.grade as GradeKey]}`}
                  >
                    {r.percent}%
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-text-2 text-xs">
              천장: {PITY}회 미획득 시 LEGENDARY 1개 확정
              <span className="ml-2 text-text-2">(현재 {pity}/{PITY})</span>
            </p>
          </section>
        </div>
      </div>

      {/* ── 하단: 도감 (uxui_07) ── */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1 text-sm font-semibold">
            <Crown className="h-4 w-4 text-gold" /> 도감 {ownedCount} / {dex.length}
          </h2>
          <span className="text-text-2 text-xs">장착할 동반자를 선택하세요</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {dex.map((c) => (
            <DexCard key={c.id} character={c} onEquip={() => equip(c.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function gradeWeight(g: string): number {
  return { COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3 }[g] ?? 0;
}

// 도감 카드 — 보유: 아바타+배지+이름+장착 버튼 / 미보유: dim placeholder + ??? + 미획득
function DexCard({
  character,
  onEquip,
}: {
  character: SummonCharacter;
  onEquip: () => void;
}) {
  const owned = character.owned;
  return (
    <div
      className={`card flex flex-col items-center gap-2 ${
        character.equipped ? "border-accent" : ""
      }`}
    >
      <PixelTile
        grade={character.grade}
        size={88}
        locked={!owned}
        label={owned ? undefined : "?"}
        className={owned ? "" : "opacity-60"}
      />
      <GradeBadge grade={character.grade} />
      <div className="text-center text-sm font-medium">
        {owned ? character.name : "???"}
      </div>

      {owned ? (
        character.equipped ? (
          <button className="btn-primary w-full" disabled>
            장착중 ✓
          </button>
        ) : (
          <button className="btn-ghost w-full" onClick={onEquip}>
            장착
          </button>
        )
      ) : (
        <div className="flex w-full items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-text-2">
          <Lock className="h-3 w-3" /> 미획득
        </div>
      )}
    </div>
  );
}
