package handlers

import (
	"errors"
	"net/http"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
)

type NotificationsHandler struct {
	Push        *repo.PushRepo
	VapidPublic string
}

func NewNotificationsHandler(p *repo.PushRepo, vapidPublic string) *NotificationsHandler {
	return &NotificationsHandler{Push: p, VapidPublic: vapidPublic}
}

// Vapid exposes the server's VAPID public key so the browser can subscribe.
func (h *NotificationsHandler) Vapid(c *gin.Context) {
	Respond(c, http.StatusOK, gin.H{"public_key": h.VapidPublic})
}

type subscribeReq struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

func (h *NotificationsHandler) Subscribe(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *subscribeReq) error {
		if r.Endpoint == "" {
			return errors.New("endpoint required")
		}
		return nil
	})
	if !ok {
		return
	}
	if err := h.Push.Subscribe(c.Request.Context(), uid, req.Endpoint, req.Keys.P256dh, req.Keys.Auth); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, okResponse{OK: true})
}
