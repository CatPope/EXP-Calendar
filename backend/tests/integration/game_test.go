package integration

import (
	"math"
	"testing"
)

// FR-GAME-01: 가입 직후 성향 설문 → tendency 저장.
func TestFR_GAME_01_OnboardingSetsTendency(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("game01")
	if me := c.Me(); me.Tendency == "HARD" {
		t.Fatalf("fresh user already has HARD tendency, fixture leaked")
	}
	c.Onboard("HARD")
	if me := c.Me(); me.Tendency != "HARD" {
		t.Fatalf("tendency not persisted: want HARD got %q", me.Tendency)
	}
}

// SSoT reward formula (api_and_rules.md + engine.go):
//
//	base       : LOW=(10,5), MEDIUM=(25,12), HIGH=(50,25)
//	levelBonus : 1.5 if userLevel < 10 else 1.0
//	tendency   : EASY=1.2, NORMAL=1.0, HARD=0.8
//	final      : round(base * levelBonus * tendencyMul)
func expectedReward(diff string, level int, tendency string) (int, int) {
	var baseExp, basePts int
	switch diff {
	case "LOW":
		baseExp, basePts = 10, 5
	case "HIGH":
		baseExp, basePts = 50, 25
	default:
		baseExp, basePts = 25, 12
	}
	lb := 1.0
	if level < 10 {
		lb = 1.5
	}
	tb := 1.0
	switch tendency {
	case "EASY":
		tb = 1.2
	case "HARD":
		tb = 0.8
	}
	return int(math.Round(float64(baseExp) * lb * tb)), int(math.Round(float64(basePts) * lb * tb))
}

// FR-GAME-05 + FR-GAME-03: difficulty differentiated reward with low-level bonus.
func TestFR_GAME_05_RewardMatrix_LowLevel(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("game05low")
	c.Onboard("NORMAL")

	for _, diff := range []string{"LOW", "MEDIUM", "HIGH"} {
		t.Run(diff, func(t *testing.T) {
			s := c.CreateSchedule("t-"+diff, diff, time0Today23())
			r := c.CompleteSchedule(s.ID).Reward
			wantExp, wantPts := expectedReward(diff, 1, "NORMAL")
			if r.ExpGained != wantExp || r.PointsGained != wantPts {
				t.Fatalf("%s: want exp=%d pts=%d, got exp=%d pts=%d",
					diff, wantExp, wantPts, r.ExpGained, r.PointsGained)
			}
		})
	}
}

// FR-GAME-03: 고레벨(>=10)은 ×1.0, 저레벨은 ×1.5. 같은 NORMAL+MEDIUM 일정 보상이
// 저레벨 사용자 > 고레벨 사용자 임을 검증.
// 새 계정으로는 직접 레벨 10을 만들기 어려우므로 보상 자체가 base값(25/12)에
// 정확히 일치하는지 확인하는 대신, 저레벨 ×1.5 분기를 다시 한 번 확인.
func TestFR_GAME_03_LowLevelBonusVisibleInGrant(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("game03")
	c.Onboard("NORMAL")
	s := c.CreateSchedule("med", "MEDIUM", time0Today23())
	r := c.CompleteSchedule(s.ID).Reward
	if r.ExpGained != 38 || r.PointsGained != 18 {
		t.Fatalf("low-level MEDIUM want exp=38 pts=18, got exp=%d pts=%d",
			r.ExpGained, r.PointsGained)
	}
}

// FR-GAME-05 (cont.): 일일 한도 200p, 초과분 0 지급.
func TestFR_GAME_05_DailyPointsCap(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("game05cap")
	c.Onboard("NORMAL")

	if cap := c.Me().DailyPointsCap; cap != 200 {
		t.Fatalf("daily_points_cap want 200 got %d", cap)
	}

	// HIGH × low-level = 38p per completion. 6 completions → 228p attempted.
	var capReached bool
	for i := 0; i < 8; i++ {
		s := c.CreateSchedule("cap", "HIGH", time0Today23())
		r := c.CompleteSchedule(s.ID).Reward
		if r.DailyCapReached {
			capReached = true
			break
		}
	}
	if !capReached {
		t.Fatal("expected daily_cap_reached=true within 8 completions, got none")
	}

	// Once capped, further completions must grant 0 points but EXP must keep flowing.
	s := c.CreateSchedule("post-cap", "HIGH", time0Today23())
	r := c.CompleteSchedule(s.ID).Reward
	if r.PointsGained != 0 {
		t.Fatalf("post-cap completion must yield 0 points, got %d", r.PointsGained)
	}
	if r.ExpGained == 0 {
		t.Fatal("post-cap completion must still grant EXP (cap is points-only)")
	}
	if !r.DailyCapReached {
		t.Fatal("daily_cap_reached should remain true after cap is hit")
	}
	if pts := c.Me().DailyPointsEarned; pts != 200 {
		t.Fatalf("daily_points_earned must be exactly 200 after cap, got %d", pts)
	}
}

// FR-GAME-04: 3 fixed daily quests (ADD_PLAN / COMPLETE_PLAN / VISIT_SHOWCASE).
func TestFR_GAME_04_ThreeFixedDailyQuests(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("game04")
	c.Onboard("NORMAL")
	qs := c.QuestsToday()
	if len(qs) != 3 {
		t.Fatalf("want 3 quests, got %d (%+v)", len(qs), qs)
	}
	seen := map[string]bool{}
	for _, q := range qs {
		seen[q.QuestType] = true
		if q.RewardPoints <= 0 {
			t.Fatalf("quest %s reward must be positive, got %d", q.QuestType, q.RewardPoints)
		}
	}
	for _, want := range []string{"ADD_PLAN", "COMPLETE_PLAN", "VISIT_SHOWCASE"} {
		if !seen[want] {
			t.Fatalf("missing daily quest %s, got %+v", want, qs)
		}
	}
}

// VISIT_SHOWCASE is the only quest that has no other trigger — explicit
// /complete call should grant its reward; a second call is idempotent.
func TestFR_GAME_04_VisitShowcaseQuestIdempotent(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("game04vs")
	c.Onboard("NORMAL")
	first := c.CompleteQuest("VISIT_SHOWCASE")
	if !first.Completed || first.RewardPoints <= 0 {
		t.Fatalf("first complete: %+v", first)
	}
	second := c.CompleteQuest("VISIT_SHOWCASE")
	if second.RewardPoints != 0 {
		t.Fatalf("second complete must be idempotent (0 points), got %d", second.RewardPoints)
	}
	if second.CurrentPoints != first.CurrentPoints {
		t.Fatalf("points changed on re-claim: %d → %d", first.CurrentPoints, second.CurrentPoints)
	}
}

// SSoT: LevelFromExp = 1 + floor(sqrt(total_exp / 100)).
// ExpToNextLevel = level^2 * 100 - total_exp.
func TestLevelFormulaConsistentWithMe(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("levelformula")
	c.Onboard("NORMAL")
	for i := 0; i < 5; i++ {
		s := c.CreateSchedule("h", "HIGH", time0Today23())
		c.CompleteSchedule(s.ID)
	}
	me := c.Me()
	wantLevel := 1 + int(math.Floor(math.Sqrt(float64(me.TotalExp)/100.0)))
	if me.Level != wantLevel {
		t.Fatalf("level mismatch: total_exp=%d → want level %d, got %d",
			me.TotalExp, wantLevel, me.Level)
	}
	wantGap := me.Level*me.Level*100 - me.TotalExp
	if wantGap < 0 {
		wantGap = 0
	}
	if me.ExpToNextLevel != wantGap {
		t.Fatalf("exp_to_next_level mismatch: want %d got %d", wantGap, me.ExpToNextLevel)
	}
}
