// Package game implements the deterministic gameplay rules: EXP/Points formulas,
// level curve, daily points cap, title auto-grant predicates, daily-quest rewards
// and gacha (소환) probabilities. All rules here are mirrored in the SSoT doc
// docs/for_ai/spec/api_and_rules.md — keep both in sync (CLAUDE.md rule).
package game

import (
	"math"
	"strconv"
	"strings"
	"time"
)

// ─────────────────────────────────────────────────────────────
// 휴면/복귀 정책 (FR-DORM-01~06) — 상수
// ─────────────────────────────────────────────────────────────

const (
	// DormancyThresholdDays: 마지막 활동으로부터 N일 이상 미접속이면 자동 휴면 (FR-DORM-01).
	DormancyThresholdDays = 14
	// DormancyWarningDay: N일차에 휴면 경고 알림 발송 (FR-NOTI-03).
	DormancyWarningDay = 13
	// ReturnBuffDays: 복귀 후 EXP 1.5배 버프 유지 기간 (FR-DORM-04).
	ReturnBuffDays = 7
	// ReturnBuffMultiplierExp: 버프 활성 시 EXP 가산 배수.
	ReturnBuffMultiplierExp = 1.5
	// ReturnPointsBonus: 복귀 즉시 지급 포인트 (14일치 일일 한도 이상, FR-DORM-03).
	ReturnPointsBonus = 14 * 200
	// ReturnDefenseTicketsFirstTime: 최초 복귀 시 무료 지급 등급 하락 방어권 수 (FR-DORM-05).
	ReturnDefenseTicketsFirstTime = 3
)

// IsReturnBuffActive reports whether the user's return EXP buff window is still open.
func IsReturnBuffActive(buffUntil *time.Time, now time.Time) bool {
	return buffUntil != nil && buffUntil.After(now)
}

// CalculateRewardWithBuff is CalculateReward with the FR-DORM-04 return buff
// optionally applied to EXP only (points are not boosted to keep cap fair).
func CalculateRewardWithBuff(difficulty string, userLevel int, tendency string, returnBuff bool) (int, int) {
	baseExp, basePts := baseRewards(difficulty)
	levelBonus := 1.0
	if userLevel < 10 {
		levelBonus = 1.5
	}
	tendencyBonus := tendencyMultiplier(tendency)
	expMult := 1.0
	if returnBuff {
		expMult = ReturnBuffMultiplierExp
	}
	exp := int(math.Round(float64(baseExp) * levelBonus * tendencyBonus * expMult))
	pts := int(math.Round(float64(basePts) * levelBonus * tendencyBonus))
	return exp, pts
}

// CalculateReward returns (exp, points) using SSoT formulas.
//
//	difficulty: LOW|MEDIUM|HIGH
//	userLevel:  current level (pre-completion)
//	tendency:   EASY|NORMAL|HARD
func CalculateReward(difficulty string, userLevel int, tendency string) (int, int) {
	baseExp, basePts := baseRewards(difficulty)
	levelBonus := 1.0
	if userLevel < 10 {
		levelBonus = 1.5
	}
	tendencyBonus := tendencyMultiplier(tendency)
	exp := int(math.Round(float64(baseExp) * levelBonus * tendencyBonus))
	pts := int(math.Round(float64(basePts) * levelBonus * tendencyBonus))
	return exp, pts
}

// ComputeReward is an alias for CalculateReward.
func ComputeReward(difficulty string, userLevel int, tendency string) (int, int) {
	return CalculateReward(difficulty, userLevel, tendency)
}

func baseRewards(difficulty string) (int, int) {
	switch difficulty {
	case "LOW":
		return 10, 5
	case "HIGH":
		return 50, 25
	case "MEDIUM":
		fallthrough
	default:
		return 25, 12
	}
}

func tendencyMultiplier(t string) float64 {
	switch t {
	case "EASY":
		return 1.2
	case "HARD":
		return 0.8
	case "NORMAL":
		fallthrough
	default:
		return 1.0
	}
}

// LevelFromExp returns level = 1 + floor(sqrt(total_exp / 100)).
func LevelFromExp(totalExp int) int {
	if totalExp <= 0 {
		return 1
	}
	return 1 + int(math.Floor(math.Sqrt(float64(totalExp)/100.0)))
}

// ExpToNextLevel returns the EXP remaining to reach level+1.
// Formula: (level^2 * 100) - total_exp (per SSoT).
func ExpToNextLevel(level, totalExp int) int {
	threshold := level * level * 100
	gap := threshold - totalExp
	if gap < 0 {
		return 0
	}
	return gap
}

// DailyPointsCap returns the daily cap (function form for legacy call style).
func DailyPointsCap() int { return 200 }

// ApplyDailyCap returns (granted, capReached) given current earned and gross gain.
// granted may be less than gross; capReached indicates the user hit cap with this grant.
func ApplyDailyCap(currentEarned, gross int) (int, bool) {
	cap := DailyPointsCap()
	remaining := cap - currentEarned
	if remaining <= 0 {
		return 0, true
	}
	if gross >= remaining {
		return remaining, true
	}
	return gross, false
}

// ─────────────────────────────────────────────────────────────
// 칭호 조건 (SRS v1.3 Appendix C) — 조건은 titles.condition 컬럼에
// "KIND:THRESHOLD" 형식으로 저장된다. 레벨 기반 칭호는 v1.3에서 폐기됨.
// ─────────────────────────────────────────────────────────────

// TitleCond is a parsed title unlock condition (e.g. "STREAK:7").
type TitleCond struct {
	Kind      string // COMPLETE_COUNT | STREAK | MORNING_COUNT | HIGH_COUNT | OVERDUE_COUNT | LEGENDARY_CHAR
	Threshold int
}

// ParseTitleCondition parses a "KIND:THRESHOLD" condition string.
func ParseTitleCondition(s string) (TitleCond, bool) {
	parts := strings.SplitN(s, ":", 2)
	if len(parts) != 2 {
		return TitleCond{}, false
	}
	n, err := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil {
		return TitleCond{}, false
	}
	return TitleCond{Kind: strings.TrimSpace(parts[0]), Threshold: n}, true
}

// TitleProgress holds the aggregate counters used to evaluate title conditions.
type TitleProgress struct {
	CompleteCount  int // 누적 완료 일정 수
	Streak         int // 현재 연속 완료 일수
	MorningCount   int // 오전 6시 이전 완료 누적
	HighCount      int // HIGH 난이도 완료 누적
	OverdueCount   int // OVERDUE 누적
	LegendaryChars int // 보유 LEGENDARY 캐릭터 종수
}

// ProgressFor returns (conditionKind, current, threshold) for a raw condition
// string such as "STREAK:7". It maps each kind to the matching counter in p.
// Unknown or unparseable conditions return ("", 0, 0).
func (p TitleProgress) ProgressFor(condition string) (kind string, current, threshold int) {
	cond, ok := ParseTitleCondition(condition)
	if !ok {
		return "", 0, 0
	}
	switch cond.Kind {
	case "COMPLETE_COUNT":
		return cond.Kind, p.CompleteCount, cond.Threshold
	case "STREAK":
		return cond.Kind, p.Streak, cond.Threshold
	case "MORNING_COUNT":
		return cond.Kind, p.MorningCount, cond.Threshold
	case "HIGH_COUNT":
		return cond.Kind, p.HighCount, cond.Threshold
	case "OVERDUE_COUNT":
		return cond.Kind, p.OverdueCount, cond.Threshold
	case "LEGENDARY_CHAR":
		return cond.Kind, p.LegendaryChars, cond.Threshold
	}
	return "", 0, 0
}

// Satisfies reports whether the condition is met by this progress.
func (p TitleProgress) Satisfies(c TitleCond) bool {
	switch c.Kind {
	case "COMPLETE_COUNT":
		return p.CompleteCount >= c.Threshold
	case "STREAK":
		return p.Streak >= c.Threshold
	case "MORNING_COUNT":
		return p.MorningCount >= c.Threshold
	case "HIGH_COUNT":
		return p.HighCount >= c.Threshold
	case "OVERDUE_COUNT":
		return p.OverdueCount >= c.Threshold
	case "LEGENDARY_CHAR":
		return p.LegendaryChars >= c.Threshold
	}
	return false
}

// ─────────────────────────────────────────────────────────────
// 일일 퀘스트 보상 (FR-GAME-04 / FR-GAME-06)
// ─────────────────────────────────────────────────────────────

// QuestRewardPoints returns the base point reward for a daily quest type.
func QuestRewardPoints(questType string) int {
	switch questType {
	case "ADD_PLAN":
		return 20
	case "COMPLETE_PLAN":
		return 30
	case "VISIT_SHOWCASE":
		return 15
	}
	return 0
}

// AllQuestsBonusPoints is the bonus for completing all 3 daily quests (FR-GAME-06).
func AllQuestsBonusPoints() int { return 50 }

// QuestStreakMultiplier returns the point multiplier for an all-quests streak.
// 7 consecutive days of completing all quests doubles the reward.
func QuestStreakMultiplier(streakDays int) int {
	if streakDays >= 7 {
		return 2
	}
	return 1
}

// ─────────────────────────────────────────────────────────────
// 소환 (가챠) 확률·천장 (SRS v1.3 Appendix D, FR-SUMMON-01~05)
// ─────────────────────────────────────────────────────────────

const (
	PityThreshold    = 90  // 90회 연속 LEGENDARY 미획득 시 다음 소환 확정
	SummonCostSingle = 100 // 단차 포인트
	SummonCostMulti  = 900 // 10연차 포인트
	SummonMultiCount = 10
)

// RollRarity maps a uniform random value r∈[0,1) to a rarity.
// Base rates: LEGENDARY 3% / EPIC 9% / RARE 28% / COMMON 60%.
// pickup doubles LEGENDARY to 6% (remainder absorbed by COMMON).
func RollRarity(r float64, pickup bool) string {
	leg := 0.03
	if pickup {
		leg = 0.06
	}
	epic := 0.09
	rare := 0.28
	switch {
	case r < leg:
		return "LEGENDARY"
	case r < leg+epic:
		return "EPIC"
	case r < leg+epic+rare:
		return "RARE"
	default:
		return "COMMON"
	}
}

// RarityRank orders rarities; higher is rarer. Used for guarantees/comparison.
func RarityRank(rarity string) int {
	switch rarity {
	case "RARE":
		return 1
	case "EPIC":
		return 2
	case "LEGENDARY":
		return 3
	default: // COMMON
		return 0
	}
}

// DuplicateRefund returns the point refund granted when a summoned character is
// already owned (FR-SUMMON-04).
func DuplicateRefund(rarity string) int {
	switch rarity {
	case "RARE":
		return 30
	case "EPIC":
		return 80
	case "LEGENDARY":
		return 200
	default: // COMMON
		return 10
	}
}

// ─────────────────────────────────────────────────────────────
// 등급 (Rating) — 누적 성공률 5단계 D~S (FR-STAT-03)
// ─────────────────────────────────────────────────────────────

// RatingGrade returns D/C/B/A/S from completed/failed counts (cumulative success rate).
func RatingGrade(completed, failed int) string {
	total := completed + failed
	if total == 0 {
		return "D"
	}
	rate := float64(completed) / float64(total)
	switch {
	case rate >= 0.95:
		return "S"
	case rate >= 0.85:
		return "A"
	case rate >= 0.70:
		return "B"
	case rate >= 0.50:
		return "C"
	default:
		return "D"
	}
}

// NextGrade returns the grade immediately above the given one.
// D→C→B→A→S. At S (maximum) it returns "" to signal no higher grade.
func NextGrade(grade string) string {
	switch grade {
	case "D":
		return "C"
	case "C":
		return "B"
	case "B":
		return "A"
	case "A":
		return "S"
	default: // "S" or unknown
		return ""
	}
}

// gradeThresholds holds the lower-bound success rate (0..1) for each grade.
// Band boundaries (inclusive lower, exclusive upper):
//
//	D: [0.00, 0.50)  — threshold for D is 0.00
//	C: [0.50, 0.70)  — threshold for C is 0.50
//	B: [0.70, 0.85)  — threshold for B is 0.70
//	A: [0.85, 0.95)  — threshold for A is 0.85
//	S: [0.95, 1.00]  — threshold for S is 0.95
var gradeLower = map[string]float64{
	"D": 0.00,
	"C": 0.50,
	"B": 0.70,
	"A": 0.85,
	"S": 0.95,
}

// gradeUpper is the lower bound of the *next* grade (exclusive upper of current).
var gradeUpper = map[string]float64{
	"D": 0.50,
	"C": 0.70,
	"B": 0.85,
	"A": 0.95,
	"S": 1.00,
}

// NextGradeProgress returns the next grade name and progress percentage (0..100)
// through the current grade band toward that next grade.
//
// successRate is in [0.0, 1.0] (same scale as RatingGrade uses internally).
// At grade S (already maximum), returns ("", 100).
//
// Example: successRate=0.80 → grade B (band 0.70..0.85), progress = (0.80-0.70)/(0.85-0.70)
// = 0.10/0.15 = 66.7% → 67, nextGrade = "A".
func NextGradeProgress(successRate float64) (nextGrade string, pct int) {
	// Clamp to [0,1].
	if successRate < 0 {
		successRate = 0
	}
	if successRate > 1 {
		successRate = 1
	}

	// Determine current grade from the rate.
	var currentGrade string
	switch {
	case successRate >= 0.95:
		currentGrade = "S"
	case successRate >= 0.85:
		currentGrade = "A"
	case successRate >= 0.70:
		currentGrade = "B"
	case successRate >= 0.50:
		currentGrade = "C"
	default:
		currentGrade = "D"
	}

	next := NextGrade(currentGrade)
	if next == "" {
		// Already at S — no next grade.
		return "", 100
	}

	lower := gradeLower[currentGrade]
	upper := gradeUpper[currentGrade]
	bandWidth := upper - lower
	if bandWidth <= 0 {
		return next, 100
	}
	progress := (successRate - lower) / bandWidth
	pct = int(math.Round(progress * 100))
	if pct < 0 {
		pct = 0
	}
	if pct > 100 {
		pct = 100
	}
	return next, pct
}

