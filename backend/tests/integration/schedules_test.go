package integration

import (
	"net/http"
	"strings"
	"testing"
	"time"
)

// CRUD smoke. Not directly mapped to FR-AUTH-03 (GCal read), but covers
// the schedule resource API contract from api_and_rules.md §3.
func TestSchedulesCRUDFlow(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("sched")
	c.Onboard("NORMAL")

	due := time.Now().UTC().Add(2 * time.Hour)
	s := c.CreateSchedule("crud-1", "MEDIUM", due)
	if s.ID == "" || s.Status != "PENDING" {
		t.Fatalf("created bad schedule: %+v", s)
	}

	// PATCH: rename + change difficulty
	var updated Schedule
	c.MustDo(http.MethodPatch, "/api/schedules/"+s.ID, map[string]any{
		"title":      "crud-1-renamed",
		"difficulty": "HIGH",
	}, &updated)
	if updated.Title != "crud-1-renamed" || updated.Difficulty != "HIGH" {
		t.Fatalf("patch ignored: %+v", updated)
	}

	// Complete
	resp := c.CompleteSchedule(s.ID)
	if resp.Schedule.Status != "COMPLETED" {
		t.Fatalf("status not COMPLETED: %+v", resp.Schedule)
	}
	if resp.Schedule.CompletedAt == nil {
		t.Fatal("completed_at must be set after complete")
	}

	// Completing twice should be a client error (already completed).
	if err := c.Do(http.MethodPost, "/api/schedules/"+s.ID+"/complete", nil, nil); err == nil {
		t.Fatal("expected error on double-complete")
	}

	// Delete a separate one to test DELETE path.
	other := c.CreateSchedule("delete-me", "LOW", due)
	c.MustDo(http.MethodDelete, "/api/schedules/"+other.ID, nil, nil)
	// Subsequent PATCH should 404.
	status, _, _ := c.RawDo(http.MethodPatch, "/api/schedules/"+other.ID, map[string]any{"title": "x"})
	if status != http.StatusNotFound {
		t.Fatalf("deleted schedule patch: want 404, got %d", status)
	}
}

// SSoT: difficulty must be one of LOW/MEDIUM/HIGH. Bad input → 400.
func TestSchedulesBadDifficultyRejected(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("schedbad")
	c.Onboard("NORMAL")
	err := c.Do(http.MethodPost, "/api/schedules", map[string]any{
		"title":      "x",
		"difficulty": "EXTREME",
		"due_date":   time.Now().UTC().Format(time.RFC3339),
	}, nil)
	if err == nil {
		t.Fatal("expected 400 on bad difficulty")
	}
	if ae, ok := err.(*APIError); !ok || ae.Status != http.StatusBadRequest {
		t.Fatalf("want 400, got %v", err)
	}
}

// COMPLETE_PLAN daily quest must auto-progress when a schedule is completed.
func TestQuestCompletePlanAutoProgresses(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("autoplan")
	c.Onboard("NORMAL")
	before := byType(c.QuestsToday(), "COMPLETE_PLAN")
	if before.Completed {
		t.Fatalf("fresh user shouldn't have COMPLETE_PLAN done: %+v", before)
	}
	s := c.CreateSchedule("autoq", "LOW", time0Today23())
	c.CompleteSchedule(s.ID)
	after := byType(c.QuestsToday(), "COMPLETE_PLAN")
	if !after.Completed {
		t.Fatalf("COMPLETE_PLAN must be auto-marked after completion: %+v", after)
	}
	// also verify ADD_PLAN's quest_type string consistency
	if _, ok := strings.CutPrefix(after.QuestType, "COMPLETE_PLAN"); !ok {
		t.Fatalf("quest_type identity changed: %s", after.QuestType)
	}
}

func byType(qs []Quest, qtype string) Quest {
	for _, q := range qs {
		if q.QuestType == qtype {
			return q
		}
	}
	return Quest{}
}
