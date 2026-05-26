package handlers

import (
	"net/http"

	"github.com/expcalendar/backend/internal/game"
	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
)

type MeHandler struct {
	Users  *repo.UserRepo
	Titles *repo.TitleRepo
}

func NewMeHandler(u *repo.UserRepo, t *repo.TitleRepo) *MeHandler {
	return &MeHandler{Users: u, Titles: t}
}

func (h *MeHandler) Get(c *gin.Context) {
	uid := middleware.MustUserID(c)
	u, err := h.Users.GetByID(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}

	equipped, _ := h.Titles.EquippedFor(c.Request.Context(), uid)
	var equippedJSON any = nil
	if equipped != nil {
		equippedJSON = models.EquippedTitle{
			ID:               equipped.Title.ID,
			Name:             equipped.Title.Name,
			Grade:            equipped.Title.Grade,
			ColorHex:         equipped.Title.ColorHex,
			NegativeModifier: equipped.NegativeModifier,
		}
	}
	Respond(c, http.StatusOK, gin.H{
		"id":                     u.ID,
		"email":                  u.Email,
		"display_name":           u.DisplayName,
		"level":                  u.Level,
		"total_exp":              u.TotalExp,
		"exp_to_next_level":      game.ExpToNextLevel(u.Level, u.TotalExp),
		"current_points":         u.CurrentPoints,
		"daily_points_earned":    u.DailyPointsEarned,
		"daily_points_cap":       game.DailyPointsCap(),
		"account_status":         u.AccountStatus,
		"persona_character_type": u.PersonaCharacterType,
		"persona_definition":     u.PersonaDefinition,
		"persona_tokens":         u.PersonaTokens,
		"equipped_title":         equippedJSON,
		"tendency":               u.Tendency,
	})
}

type onboardingReq struct {
	Tendency string `json:"tendency"`
}

func (h *MeHandler) Onboarding(c *gin.Context) {
	uid := middleware.MustUserID(c)
	var req onboardingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "tendency required")
		return
	}
	switch req.Tendency {
	case "EASY", "NORMAL", "HARD":
	default:
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "tendency must be EASY|NORMAL|HARD")
		return
	}
	if err := h.Users.SetTendency(c.Request.Context(), uid, req.Tendency); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{"ok": true})
}
