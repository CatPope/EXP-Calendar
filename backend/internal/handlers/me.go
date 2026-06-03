package handlers

import (
	"errors"
	"net/http"
	"strings"

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

// meResponse mirrors the legacy gin.H payload one-for-one; declared as a
// named anon-style struct so callers can rely on field order/keys.
type meResponse struct {
	ID                   any    `json:"id"`
	Email                string `json:"email"`
	DisplayName          string `json:"display_name"`
	Level                int    `json:"level"`
	TotalExp             int    `json:"total_exp"`
	ExpToNextLevel       int    `json:"exp_to_next_level"`
	CurrentPoints        int    `json:"current_points"`
	DailyPointsEarned    int    `json:"daily_points_earned"`
	DailyPointsCap       int    `json:"daily_points_cap"`
	AccountStatus        string `json:"account_status"`
	PersonaCharacterType string `json:"persona_character_type"`
	PersonaDefinition    string `json:"persona_definition"`
	PersonaName          string `json:"persona_name"`
	PersonaTone          string `json:"persona_tone"`
	PersonaHistory       string `json:"persona_history"`
	PersonaThoughts      string `json:"persona_thoughts"`
	StatusMessage        string `json:"status_message"`
	DefenseTickets       int    `json:"defense_tickets"`
	PersonaTokens        int    `json:"persona_tokens"`
	CharacterSkin        string `json:"character_skin"`
	SummonTickets        int    `json:"summon_tickets"`
	PityCounter          int    `json:"pity_counter"`
	EquippedTitle        any    `json:"equipped_title"`
	Tendency             string `json:"tendency"`
}

func (h *MeHandler) Get(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
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
	Respond(c, http.StatusOK, meResponse{
		ID:                   u.ID,
		Email:                u.Email,
		DisplayName:          u.DisplayName,
		Level:                u.Level,
		TotalExp:             u.TotalExp,
		ExpToNextLevel:       game.ExpToNextLevel(u.Level, u.TotalExp),
		CurrentPoints:        u.CurrentPoints,
		DailyPointsEarned:    u.DailyPointsEarned,
		DailyPointsCap:       game.DailyPointsCap(),
		AccountStatus:        u.AccountStatus,
		PersonaCharacterType: u.PersonaCharacterType,
		PersonaDefinition:    u.PersonaDefinition,
		PersonaName:          u.PersonaName,
		PersonaTone:          u.PersonaTone,
		PersonaHistory:       u.PersonaHistory,
		PersonaThoughts:      u.PersonaThoughts,
		StatusMessage:        u.StatusMessage,
		DefenseTickets:       u.DefenseTickets,
		PersonaTokens:        u.PersonaTokens,
		CharacterSkin:        u.CharacterSkin,
		SummonTickets:        u.SummonTickets,
		PityCounter:          u.PityCounter,
		EquippedTitle:        equippedJSON,
		Tendency:             u.Tendency,
	})
}

type profileReq struct {
	DisplayName string `json:"display_name"`
}

// SetProfile updates editable profile fields (currently display name).
func (h *MeHandler) SetProfile(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *profileReq) error {
		name := strings.TrimSpace(r.DisplayName)
		if name == "" {
			return errors.New("display_name required")
		}
		if len([]rune(name)) > 30 {
			return errors.New("display_name too long")
		}
		r.DisplayName = name
		return nil
	})
	if !ok {
		return
	}
	if err := h.Users.SetDisplayName(c.Request.Context(), uid, req.DisplayName); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, okResponse{OK: true})
}

type characterReq struct {
	Skin string `json:"skin"`
}

// SetCharacter persists the user's chosen 2D character skin id.
func (h *MeHandler) SetCharacter(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *characterReq) error {
		if r.Skin == "" {
			return errors.New("skin required")
		}
		if len(r.Skin) > 40 {
			return errors.New("skin id too long")
		}
		return nil
	})
	if !ok {
		return
	}
	if err := h.Users.SetCharacterSkin(c.Request.Context(), uid, req.Skin); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, okResponse{OK: true})
}

// buildMeResponse constructs a meResponse from a fresh user record.
// Equipped-title lookup is skipped (returns nil) to keep this helper lightweight;
// callers that need the title should use Get instead.
func buildMeResponse(u *models.User) meResponse {
	return meResponse{
		ID:                   u.ID,
		Email:                u.Email,
		DisplayName:          u.DisplayName,
		Level:                u.Level,
		TotalExp:             u.TotalExp,
		ExpToNextLevel:       game.ExpToNextLevel(u.Level, u.TotalExp),
		CurrentPoints:        u.CurrentPoints,
		DailyPointsEarned:    u.DailyPointsEarned,
		DailyPointsCap:       game.DailyPointsCap(),
		AccountStatus:        u.AccountStatus,
		PersonaCharacterType: u.PersonaCharacterType,
		PersonaDefinition:    u.PersonaDefinition,
		PersonaName:          u.PersonaName,
		PersonaTone:          u.PersonaTone,
		PersonaHistory:       u.PersonaHistory,
		PersonaThoughts:      u.PersonaThoughts,
		StatusMessage:        u.StatusMessage,
		DefenseTickets:       u.DefenseTickets,
		PersonaTokens:        u.PersonaTokens,
		CharacterSkin:        u.CharacterSkin,
		SummonTickets:        u.SummonTickets,
		PityCounter:          u.PityCounter,
		EquippedTitle:        nil,
		Tendency:             u.Tendency,
	}
}

type onboardingReq struct {
	Tendency string `json:"tendency"`
}

type okResponse struct {
	OK bool `json:"ok"`
}

func (h *MeHandler) Onboarding(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *onboardingReq) error {
		switch r.Tendency {
		case "EASY", "NORMAL", "HARD":
			return nil
		case "":
			return errors.New("tendency required")
		default:
			return errors.New("tendency must be EASY|NORMAL|HARD")
		}
	})
	if !ok {
		return
	}
	if err := h.Users.SetTendency(c.Request.Context(), uid, req.Tendency); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, okResponse{OK: true})
}

type setPersonaReq struct {
	PersonaName     *string `json:"persona_name"`
	PersonaTone     *string `json:"persona_tone"`
	PersonaHistory  *string `json:"persona_history"`
	PersonaThoughts *string `json:"persona_thoughts"`
}

// SetPersona partially updates the structured persona fields (FREE — no token cost).
// Only non-null fields in the request body are written. Returns the full updated user.
func (h *MeHandler) SetPersona(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *setPersonaReq) error {
		if r.PersonaName != nil && len([]rune(*r.PersonaName)) > 16 {
			return errors.New("persona_name max 16 characters")
		}
		if r.PersonaTone != nil && len([]rune(*r.PersonaTone)) > 60 {
			return errors.New("persona_tone max 60 characters")
		}
		if r.PersonaHistory != nil && len([]rune(*r.PersonaHistory)) > 300 {
			return errors.New("persona_history max 300 characters")
		}
		if r.PersonaThoughts != nil && len([]rune(*r.PersonaThoughts)) > 200 {
			return errors.New("persona_thoughts max 200 characters")
		}
		return nil
	})
	if !ok {
		return
	}
	if err := h.Users.UpdatePersonaFields(c.Request.Context(), uid,
		req.PersonaName, req.PersonaTone, req.PersonaHistory, req.PersonaThoughts); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, buildMeResponse(u))
}

type setStatusMessageReq struct {
	StatusMessage string `json:"status_message"`
}

// SetStatusMessage writes the user's status message (may be empty; max 200 runes).
// Returns the full updated user.
func (h *MeHandler) SetStatusMessage(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *setStatusMessageReq) error {
		r.StatusMessage = strings.TrimSpace(r.StatusMessage)
		if len([]rune(r.StatusMessage)) > 200 {
			return errors.New("status_message max 200 characters")
		}
		return nil
	})
	if !ok {
		return
	}
	if err := h.Users.SetStatusMessage(c.Request.Context(), uid, req.StatusMessage); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, buildMeResponse(u))
}
