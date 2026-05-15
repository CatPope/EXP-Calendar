package handlers

import (
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
	CharacterType string `json:"character_type"`
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

	out, err := h.LLM.Generate(c.Request.Context(), ct, titles, req.Text)
	if err != nil {
		RespondErr(c, http.StatusBadGateway, "LLM_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{
		"llm_output":     out,
		"character_type": ct,
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

	out, err := h.LLM.Generate(c.Request.Context(), ct, titles, req.Text)
	if err != nil {
		RespondErr(c, http.StatusBadGateway, "LLM_ERROR", err.Error())
		return
	}
	if err := h.Users.SetPersonaShowcase(c.Request.Context(), uid, req.Text, out); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{
		"showcase_text": req.Text,
		"llm_output":    out,
	})
}
