package handlers

import (
	"net/http"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TitlesHandler struct {
	Titles *repo.TitleRepo
}

func NewTitlesHandler(t *repo.TitleRepo) *TitlesHandler { return &TitlesHandler{Titles: t} }

func (h *TitlesHandler) ListMine(c *gin.Context) {
	uid := middleware.MustUserID(c)
	rows, err := h.Titles.ListUserTitles(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, rows)
}

type equipReq struct {
	IsEquipped  *bool `json:"is_equipped"`
	IsDisplayed *bool `json:"is_displayed"`
}

func (h *TitlesHandler) Equip(c *gin.Context) {
	uid := middleware.MustUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid id")
		return
	}
	var req equipReq
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	if req.IsEquipped != nil {
		if err := h.Titles.SetEquipped(c.Request.Context(), uid, id, *req.IsEquipped); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}
	if req.IsDisplayed != nil {
		if err := h.Titles.SetDisplayed(c.Request.Context(), uid, id, *req.IsDisplayed); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}
	// reload list and return matching one
	rows, _ := h.Titles.ListUserTitles(c.Request.Context(), uid)
	for _, ut := range rows {
		if ut.ID == id {
			Respond(c, http.StatusOK, ut)
			return
		}
	}
	RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user_title not found")
}
