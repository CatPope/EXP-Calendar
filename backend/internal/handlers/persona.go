package handlers

import (
	"errors"
	"net/http"

	"github.com/expcalendar/backend/internal/llm"
	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
)

type PersonaHandler struct {
	LLM    *llm.Client
	Users  *repo.UserRepo
	Titles *repo.TitleRepo
}

func NewPersonaHandler(l *llm.Client, u *repo.UserRepo, t *repo.TitleRepo) *PersonaHandler {
	return &PersonaHandler{LLM: l, Users: u, Titles: t}
}

type generateReq struct {
	Text          string `json:"text"`
	CharacterType string `json:"character_type"` // legacy preview hint
	Definition    string `json:"definition"`     // preview override (not persisted)
}

func (h *PersonaHandler) Generate(c *gin.Context) {
	uid := middleware.MustUserID(c)
	var req generateReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Text == "" {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "text required")
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}

	// Priority: explicit preview definition → stored definition → legacy character_type.
	def := req.Definition
	if def == "" {
		def = u.PersonaDefinition
	}
	ct := req.CharacterType
	if ct == "" {
		ct = u.PersonaCharacterType
	}
	if ct == "" {
		ct = "default"
	}

	titles := []string{}
	if userTitles, err := h.Titles.DisplayedTitlesForUser(c.Request.Context(), uid); err == nil {
		for _, t := range userTitles {
			titles = append(titles, t.Name)
		}
	}

	out, err := h.LLM.Generate(c.Request.Context(), def, ct, titles, req.Text)
	if err != nil {
		RespondErr(c, http.StatusBadGateway, "LLM_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{
		"llm_output":     out,
		"character_type": ct,
		"used_definition": def != "",
	})
}

type showcaseReq struct {
	Text string `json:"text"`
}

func (h *PersonaHandler) Showcase(c *gin.Context) {
	uid := middleware.MustUserID(c)
	var req showcaseReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Text == "" {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "text required")
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}

	// Showcase ALWAYS uses the stored definition / character_type, ignoring any
	// client-side hint. This is the monetization boundary: only paid setups
	// produce public output.
	def := u.PersonaDefinition
	ct := u.PersonaCharacterType
	if ct == "" {
		ct = "default"
	}

	titles := []string{}
	if userTitles, err := h.Titles.DisplayedTitlesForUser(c.Request.Context(), uid); err == nil {
		for _, t := range userTitles {
			titles = append(titles, t.Name)
		}
	}

	out, err := h.LLM.Generate(c.Request.Context(), def, ct, titles, req.Text)
	if err != nil {
		RespondErr(c, http.StatusBadGateway, "LLM_ERROR", err.Error())
		return
	}
	if err := h.Users.SetPersonaShowcase(c.Request.Context(), uid, req.Text, out); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{
		"showcase_text":   req.Text,
		"llm_output":      out,
		"used_definition": def != "",
	})
}

type defineReq struct {
	Definition string `json:"definition"`
}

// Define consumes 1 캐릭터 설정권 (persona_tokens >= 1 required) and writes
// the user-authored persona definition. Returns remaining tokens.
func (h *PersonaHandler) Define(c *gin.Context) {
	uid := middleware.MustUserID(c)
	var req defineReq
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	def := llm.SanitizeDefinition(req.Definition)
	if len(def) < 10 {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "definition must be at least 10 characters")
		return
	}
	remaining, err := h.Users.ConsumePersonaTokenSetDefinition(c.Request.Context(), uid, def)
	if err != nil {
		if errors.Is(err, repo.ErrNoTokens) {
			RespondErr(c, http.StatusBadRequest, "NO_PERSONA_TOKEN",
				"need 캐릭터 설정권 — purchase one in shop")
			return
		}
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{
		"persona_definition": def,
		"persona_tokens":     remaining,
	})
}
