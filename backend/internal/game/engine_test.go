package game

import "testing"

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

func TestTitlesUnlockedBetween(t *testing.T) {
	got := TitlesUnlockedBetween(2, 5)
	want := []string{"첫걸음", "초보 모험가"}
	if len(got) != len(want) {
		t.Fatalf("len got=%v want=%v", got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Errorf("idx %d got %s want %s", i, got[i], want[i])
		}
	}
	if len(TitlesUnlockedBetween(10, 10)) != 0 {
		t.Errorf("no-op should return empty")
	}
}
