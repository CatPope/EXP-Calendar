package handlers

import (
	"net/http"
	"strings"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ShopHandler struct {
	Pool  *pgxpool.Pool
	Shop  *repo.ShopRepo
	Users *repo.UserRepo
}

func NewShopHandler(p *pgxpool.Pool, s *repo.ShopRepo, u *repo.UserRepo) *ShopHandler {
	return &ShopHandler{Pool: p, Shop: s, Users: u}
}

func (h *ShopHandler) List(c *gin.Context) {
	items, err := h.Shop.ListItems(c.Request.Context())
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, items)
}

type purchaseReq struct {
	ItemID string `json:"item_id"`
}

func (h *ShopHandler) Purchase(c *gin.Context) {
	uid := middleware.MustUserID(c)
	var req purchaseReq
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	itemID, err := uuid.Parse(req.ItemID)
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid item_id")
		return
	}
	it, err := h.Shop.GetItem(c.Request.Context(), itemID)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "item not found")
		return
	}

	remaining, err := h.Users.SpendPoints(c.Request.Context(), uid, it.Price)
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "INSUFFICIENT_POINTS", "not enough points")
		return
	}
	purchase, err := h.Shop.RecordPurchase(c.Request.Context(), uid, it.ID, it.Price)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	// Side-effect: PERSONA items set the user's persona_character_type.
	if it.Category == "PERSONA" {
		ct := personaFromEffect(it.Effect)
		if ct != "" {
			_ = h.Users.SetPersonaCharacterType(c.Request.Context(), uid, ct)
		}
	}
	Respond(c, http.StatusOK, gin.H{
		"purchase":         purchase,
		"remaining_points": remaining,
	})
}

func personaFromEffect(effect string) string {
	// effect like "persona:tsundere"
	if i := strings.Index(effect, ":"); i > 0 {
		return strings.TrimSpace(effect[i+1:])
	}
	return ""
}
