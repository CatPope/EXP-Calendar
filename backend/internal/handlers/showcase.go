package handlers

import (
	"net/http"
	"time"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ShowcaseHandler struct {
	Users   *repo.UserRepo
	Titles  *repo.TitleRepo
	Rewards *repo.RewardRepo
	Quests  *repo.QuestRepo
}

func NewShowcaseHandler(u *repo.UserRepo, t *repo.TitleRepo, r *repo.RewardRepo, q *repo.QuestRepo) *ShowcaseHandler {
	return &ShowcaseHandler{Users: u, Titles: t, Rewards: r, Quests: q}
}

func (h *ShowcaseHandler) Recommendations(c *gin.Context) {
	uid := middleware.MustUserID(c)
	users, err := h.Users.ListShowcaseUsers(c.Request.Context(), uid, 20)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	out := make([]gin.H, 0, len(users))
	for _, u := range users {
		var eq any = nil
		if ut, _ := h.Titles.EquippedFor(c.Request.Context(), u.ID); ut != nil {
			eq = models.EquippedTitle{
				ID:               ut.Title.ID,
				Name:             ut.Title.Name,
				Grade:            ut.Title.Grade,
				ColorHex:         ut.Title.ColorHex,
				NegativeModifier: ut.NegativeModifier,
			}
		}
		out = append(out, gin.H{
			"user_id":        u.ID,
			"display_name":   u.DisplayName,
			"level":          u.Level,
			"equipped_title": eq,
		})
	}
	Respond(c, http.StatusOK, out)
}

func (h *ShowcaseHandler) Get(c *gin.Context) {
	viewerID := middleware.MustUserID(c)
	target, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid user_id")
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), target)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}

	var equipped any = nil
	if ut, _ := h.Titles.EquippedFor(c.Request.Context(), target); ut != nil {
		equipped = models.EquippedTitle{
			ID:               ut.Title.ID,
			Name:             ut.Title.Name,
			Grade:            ut.Title.Grade,
			ColorHex:         ut.Title.ColorHex,
			NegativeModifier: ut.NegativeModifier,
		}
	}
	displayed, _ := h.Titles.DisplayedTitlesForUser(c.Request.Context(), target)

	to := timeNow().AddDate(0, 0, 1)
	from := to.AddDate(-1, 0, 0)
	grass, _ := h.Rewards.GrassByDay(c.Request.Context(), target, from, to)
	if grass == nil {
		grass = map[string]int{}
	}

	// Side effect: visiting OTHER user's showcase auto-completes the viewer's VISIT_SHOWCASE quest.
	if viewerID != target {
		_, _, _ = h.Quests.MarkCompleted(c.Request.Context(), viewerID, kstToday(), "VISIT_SHOWCASE")
	}

	Respond(c, http.StatusOK, gin.H{
		"user_id":               u.ID,
		"display_name":          u.DisplayName,
		"level":                 u.Level,
		"rating_grade":          ratingGrade(u.Level),
		"equipped_title":        equipped,
		"displayed_titles":      displayed,
		"persona_showcase_text": u.PersonaShowcaseText,
		"persona_llm_output":    u.PersonaLLMOutput,
		"grass":                 grass,
	})
}

// ratingGrade derives a simple letter grade from level (no detailed leak per FR-SOC-03).
func ratingGrade(level int) string {
	switch {
	case level >= 50:
		return "S"
	case level >= 20:
		return "A"
	case level >= 10:
		return "B"
	case level >= 5:
		return "C"
	default:
		return "D"
	}
}

// ensure time import is used (Windows static analyzers sometimes get confused)
var _ = time.Now
