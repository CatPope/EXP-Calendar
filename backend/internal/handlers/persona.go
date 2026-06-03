package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/expcalendar/backend/internal/llm"
	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
)

// buildPersonaDefinition composes a definition string from the structured
// persona fields when available, falling back to the legacy persona_definition.
// The composed form is: "{name}\n{tone}\n{history}\n{thoughts}" (parts omitted
// when empty, joined with newlines, trimmed).
func buildPersonaDefinition(u *models.User) string {
	parts := []string{}
	if u.PersonaName != "" {
		parts = append(parts, u.PersonaName)
	}
	if u.PersonaTone != "" {
		parts = append(parts, u.PersonaTone)
	}
	if u.PersonaHistory != "" {
		parts = append(parts, u.PersonaHistory)
	}
	if u.PersonaThoughts != "" {
		parts = append(parts, u.PersonaThoughts)
	}
	if len(parts) > 0 {
		return strings.TrimSpace(strings.Join(parts, "\n"))
	}
	return u.PersonaDefinition
}

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

type generateResponse struct {
	LLMOutput      string `json:"llm_output"`
	CharacterType  string `json:"character_type"`
	UsedDefinition bool   `json:"used_definition"`
}

func (h *PersonaHandler) Generate(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *generateReq) error {
		if r.Text == "" {
			return errors.New("text required")
		}
		return nil
	})
	if !ok {
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}

	// Priority: explicit preview definition → structured fields → legacy persona_definition.
	def := req.Definition
	if def == "" {
		def = buildPersonaDefinition(u)
	}
	// character_type: explicit hint → stored → persona_name (structured) → "default".
	ct := req.CharacterType
	if ct == "" {
		ct = u.PersonaCharacterType
	}
	if ct == "" && u.PersonaName != "" {
		ct = u.PersonaName
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
	Respond(c, http.StatusOK, generateResponse{
		LLMOutput:      out,
		CharacterType:  ct,
		UsedDefinition: def != "",
	})
}

type showcaseReq struct {
	Text string `json:"text"`
}

type showcaseResponse struct {
	ShowcaseText   string `json:"showcase_text"`
	LLMOutput      string `json:"llm_output"`
	UsedDefinition bool   `json:"used_definition"`
}

func (h *PersonaHandler) Showcase(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *showcaseReq) error {
		if r.Text == "" {
			return errors.New("text required")
		}
		return nil
	})
	if !ok {
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}

	// Showcase ALWAYS uses the stored persona (structured fields preferred, then
	// legacy definition), ignoring any client-side hint. This is the monetization
	// boundary: only paid setups produce public output.
	def := buildPersonaDefinition(u)
	ct := u.PersonaCharacterType
	if ct == "" && u.PersonaName != "" {
		ct = u.PersonaName
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
	if err := h.Users.SetPersonaShowcase(c.Request.Context(), uid, req.Text, out); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, showcaseResponse{
		ShowcaseText:   req.Text,
		LLMOutput:      out,
		UsedDefinition: def != "",
	})
}

type defineReq struct {
	Definition string `json:"definition"`
}

type defineResponse struct {
	PersonaDefinition string `json:"persona_definition"`
	PersonaTokens     int    `json:"persona_tokens"`
}

// Define consumes 1 캐릭터 설정권 (persona_tokens >= 1 required) and writes
// the user-authored persona definition. Returns remaining tokens.
func (h *PersonaHandler) Define(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate[defineReq](c, nil)
	if !ok {
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
	Respond(c, http.StatusOK, defineResponse{
		PersonaDefinition: def,
		PersonaTokens:     remaining,
	})
}
