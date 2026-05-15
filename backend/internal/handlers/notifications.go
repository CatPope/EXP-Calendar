package handlers

import (
	"net/http"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
)

type NotificationsHandler struct {
	Push *repo.PushRepo
}

func NewNotificationsHandler(p *repo.PushRepo) *NotificationsHandler {
	return &NotificationsHandler{Push: p}
}

type subscribeReq struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

func (h *NotificationsHandler) Subscribe(c *gin.Context) {
	uid := middleware.MustUserID(c)
	var req subscribeReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Endpoint == "" {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "endpoint required")
		return
	}
	if err := h.Push.Subscribe(c.Request.Context(), uid, req.Endpoint, req.Keys.P256dh, req.Keys.Auth); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{"ok": true})
}
