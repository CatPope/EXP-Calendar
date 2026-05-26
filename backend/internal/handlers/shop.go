package handlers

import (
	"net/http"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

	ctx := c.Request.Context()
	tx, err := h.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer tx.Rollback(ctx)

	remaining, err := h.Users.SpendPointsTx(ctx, tx, uid, it.Price)
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "INSUFFICIENT_POINTS", "not enough points")
		return
	}
	purchase, err := h.Shop.RecordPurchaseTx(ctx, tx, uid, it.ID, it.Price)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	// Side-effect: 캐릭터 설정권 (effect=persona:token) grants a 1-shot persona
	// definition write. Other PERSONA-category items would be no-ops here.
	if it.Category == "PERSONA" && it.Effect == "persona:token" {
		if err := h.Users.AddPersonaTokens(ctx, tx, uid, 1); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	Respond(c, http.StatusOK, gin.H{
		"purchase":         purchase,
		"remaining_points": remaining,
	})
}
