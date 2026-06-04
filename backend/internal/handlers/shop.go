package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ShopHandler struct {
	Pool   *pgxpool.Pool
	Shop   *repo.ShopRepo
	Users  *repo.UserRepo
	Titles *repo.TitleRepo
}

func NewShopHandler(p *pgxpool.Pool, s *repo.ShopRepo, u *repo.UserRepo, t *repo.TitleRepo) *ShopHandler {
	return &ShopHandler{Pool: p, Shop: s, Users: u, Titles: t}
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

type purchaseResponse struct {
	Purchase        *models.Purchase `json:"purchase"`
	RemainingPoints int              `json:"remaining_points"`
}

func (h *ShopHandler) Purchase(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *purchaseReq) error {
		if r.ItemID == "" {
			return errors.New("item_id required")
		}
		return nil
	})
	if !ok {
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
	// Side-effect: 등급 하락 방어권 (DEFENSE) adds one ticket to inventory.
	// The ticket is consumed later via POST /api/titles/use-defense (DC-07).
	if it.Category == "DEFENSE" {
		if _, err := tx.Exec(ctx, `UPDATE users SET defense_tickets=defense_tickets+1 WHERE id=$1`, uid); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}
	// Side-effect: summon ticket items (effect=summon:ticket[:N]) grant tickets.
	if it.Effect == "summon:ticket" {
		if _, err := tx.Exec(ctx, `UPDATE users SET summon_tickets=summon_tickets+1 WHERE id=$1`, uid); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}
	// Side-effect: 코스메틱 아이템 구매 시 즉시 장착 (effect=cosmetic:*).
	if strings.HasPrefix(it.Effect, "cosmetic:") {
		if _, err := tx.Exec(ctx, `UPDATE users SET active_cosmetic=$1 WHERE id=$2`, it.Effect, uid); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	Respond(c, http.StatusOK, purchaseResponse{
		Purchase:        purchase,
		RemainingPoints: remaining,
	})
}
