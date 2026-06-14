package game

import (
	"testing"
	"time"
)

func TestCalculateReward_BaseValues(t *testing.T) {
	cases := []struct {
		diff       string
		lv         int
		tendency   string
		wantExp    int
		wantPoints int
	}{
		{"LOW", 10, "NORMAL", 10, 5},
		{"MEDIUM", 12, "NORMAL", 25, 12},
		{"HIGH", 50, "NORMAL", 50, 25},
		// low-level bonus 1.5x
		{"MEDIUM", 1, "NORMAL", 38, 18}, // 25*1.5=37.5 → 38; 12*1.5=18
		{"HIGH", 5, "EASY", 90, 45},     // 50*1.5*1.2=90; 25*1.5*1.2=45
		{"LOW", 9, "HARD", 12, 6},       // 10*1.5*0.8=12; 5*1.5*0.8=6
	}
	for _, c := range cases {
		gotExp, gotPts := CalculateReward(c.diff, c.lv, c.tendency)
		if gotExp != c.wantExp || gotPts != c.wantPoints {
			t.Errorf("CalculateReward(%s,%d,%s)=(%d,%d), want (%d,%d)",
				c.diff, c.lv, c.tendency, gotExp, gotPts, c.wantExp, c.wantPoints)
		}
	}
}

func TestLevelFromExp(t *testing.T) {
	cases := []struct {
		exp  int
		want int
	}{
		{0, 1},
		{99, 1},
		{100, 2},
		{399, 2},
		{400, 3},
		{900, 4},
		{10000, 11},
	}
	for _, c := range cases {
		got := LevelFromExp(c.exp)
		if got != c.want {
			t.Errorf("LevelFromExp(%d)=%d want %d", c.exp, got, c.want)
		}
	}
}

func TestExpToNextLevel(t *testing.T) {
	// totalExp=100, level=2; threshold=400 → 300 remaining
	if got := ExpToNextLevel(2, 100); got != 300 {
		t.Errorf("ExpToNextLevel(2,100)=%d want 300", got)
	}
	if got := ExpToNextLevel(1, 0); got != 100 {
		t.Errorf("ExpToNextLevel(1,0)=%d want 100", got)
	}
}

func TestApplyDailyCap(t *testing.T) {
	g, reached := ApplyDailyCap(100, 30)
	if g != 30 || reached {
		t.Errorf("partial: got (%d,%v) want (30,false)", g, reached)
	}
	g, reached = ApplyDailyCap(150, 50)
	if g != 50 || !reached {
		t.Errorf("exact: got (%d,%v) want (50,true)", g, reached)
	}
	g, reached = ApplyDailyCap(180, 50)
	if g != 20 || !reached {
		t.Errorf("trim: got (%d,%v) want (20,true)", g, reached)
	}
	g, reached = ApplyDailyCap(200, 25)
	if g != 0 || !reached {
		t.Errorf("capped: got (%d,%v) want (0,true)", g, reached)
	}
}

func TestParseTitleConditionAndSatisfies(t *testing.T) {
	cond, ok := ParseTitleCondition("STREAK:7")
	if !ok || cond.Kind != "STREAK" || cond.Threshold != 7 {
		t.Fatalf("parse STREAK:7 got %+v ok=%v", cond, ok)
	}
	if _, ok := ParseTitleCondition("garbage"); ok {
		t.Errorf("garbage should not parse")
	}
	p := TitleProgress{CompleteCount: 1, Streak: 7, MorningCount: 10, HighCount: 20, OverdueCount: 5, LegendaryChars: 1}
	for _, c := range []string{"COMPLETE_COUNT:1", "STREAK:7", "MORNING_COUNT:10", "HIGH_COUNT:20", "OVERDUE_COUNT:5", "LEGENDARY_CHAR:1"} {
		cond, _ := ParseTitleCondition(c)
		if !p.Satisfies(cond) {
			t.Errorf("expected %s satisfied by %+v", c, p)
		}
	}
	cond, _ = ParseTitleCondition("STREAK:30")
	if (TitleProgress{Streak: 7}).Satisfies(cond) {
		t.Errorf("streak 7 should not satisfy STREAK:30")
	}
}

func TestQuestRewardPoints(t *testing.T) {
	cases := map[string]int{"ADD_PLAN": 20, "COMPLETE_PLAN": 30, "VISIT_SHOWCASE": 15, "BOGUS": 0}
	for q, want := range cases {
		if got := QuestRewardPoints(q); got != want {
			t.Errorf("QuestRewardPoints(%s)=%d want %d", q, got, want)
		}
	}
	if QuestStreakMultiplier(7) != 2 || QuestStreakMultiplier(6) != 1 {
		t.Errorf("streak multiplier wrong")
	}
}

func TestRollRarity(t *testing.T) {
	if RollRarity(0.0, false) != "LEGENDARY" {
		t.Errorf("r=0 base want LEGENDARY")
	}
	if RollRarity(0.029, false) != "LEGENDARY" || RollRarity(0.031, false) != "EPIC" {
		t.Errorf("base LEGENDARY boundary at 0.03")
	}
	if RollRarity(0.05, true) != "LEGENDARY" {
		t.Errorf("pickup doubles LEGENDARY to 0.06")
	}
	if RollRarity(0.99, false) != "COMMON" {
		t.Errorf("r=0.99 want COMMON")
	}
	if RarityRank("LEGENDARY") <= RarityRank("EPIC") || RarityRank("RARE") <= RarityRank("COMMON") {
		t.Errorf("rarity rank order wrong")
	}
}

func TestCalculateRewardWithBuff_ReturnBuffBoostsExpOnly(t *testing.T) {
	// MEDIUM, level 12, NORMAL → base (25, 12). Buff active → EXP ×1.5 = 38, Points unchanged.
	exp, pts := CalculateRewardWithBuff("MEDIUM", 12, "NORMAL", true)
	if exp != 38 || pts != 12 {
		t.Errorf("buff on: got (%d,%d) want (38,12)", exp, pts)
	}
	exp, pts = CalculateRewardWithBuff("MEDIUM", 12, "NORMAL", false)
	if exp != 25 || pts != 12 {
		t.Errorf("buff off: got (%d,%d) want (25,12)", exp, pts)
	}
	// Buff stacks with low-level bonus + tendency: HIGH, lv 5, EASY = 50*1.5*1.2*1.5 = 135
	exp, _ = CalculateRewardWithBuff("HIGH", 5, "EASY", true)
	if exp != 135 {
		t.Errorf("stacked: got %d want 135", exp)
	}
}

func TestIsReturnBuffActive(t *testing.T) {
	now := time.Date(2026, 6, 14, 12, 0, 0, 0, time.UTC)
	future := now.Add(time.Hour)
	past := now.Add(-time.Hour)
	if !IsReturnBuffActive(&future, now) {
		t.Errorf("future buff should be active")
	}
	if IsReturnBuffActive(&past, now) {
		t.Errorf("past buff should be inactive")
	}
	if IsReturnBuffActive(nil, now) {
		t.Errorf("nil buff should be inactive")
	}
}

func TestRatingGrade(t *testing.T) {
	cases := []struct {
		c, f int
		want string
	}{
		{0, 0, "D"}, {1, 1, "C"}, {95, 5, "S"}, {85, 15, "A"}, {70, 30, "B"}, {49, 51, "D"},
	}
	for _, tc := range cases {
		if got := RatingGrade(tc.c, tc.f); got != tc.want {
			t.Errorf("RatingGrade(%d,%d)=%s want %s", tc.c, tc.f, got, tc.want)
		}
	}
}
