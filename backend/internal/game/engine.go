// Package game implements the deterministic gameplay rules: EXP/Points formulas,
// level curve, daily points cap and title auto-grant predicates.
package game

import "math"

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

// TitleConditionForLevel returns the master title name that unlocks at exactly this level, or "".
func TitleConditionForLevel(level int) string {
	switch level {
	case 3:
		return "첫걸음"
	case 5:
		return "초보 모험가"
	case 10:
		return "성실한 자"
	case 20:
		return "달인"
	case 50:
		return "전설의 시간 마법사"
	}
	return ""
}

// TitlesUnlockedBetween returns titles unlocked when leveling from oldLevel to
// newLevel (exclusive of old, inclusive of new).
func TitlesUnlockedBetween(oldLevel, newLevel int) []string {
	var out []string
	for lv := oldLevel + 1; lv <= newLevel; lv++ {
		if n := TitleConditionForLevel(lv); n != "" {
			out = append(out, n)
		}
	}
	return out
}
