package handlers

import (
	"errors"
	"math/rand"
	"net/http"

	"github.com/expcalendar/backend/internal/game"
	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SummonHandler implements the gacha (소환) endpoints — SRS v1.3 §3.2.9, Appendix D.
type SummonHandler struct {
	Pool       *pgxpool.Pool
	Users      *repo.UserRepo
	Characters *repo.CharacterRepo
}

func NewSummonHandler(p *pgxpool.Pool, u *repo.UserRepo, ch *repo.CharacterRepo) *SummonHandler {
	return &SummonHandler{Pool: p, Users: u, Characters: ch}
}

// ticketPrice is the points cost to buy one summon ticket.
const ticketPrice = 100

type summonInfo struct {
	Rates        map[string]float64 `json:"rates"`
	PickupRates  map[string]float64 `json:"pickup_rates"`
	CostSingle   int                `json:"cost_single"`
	CostMulti    int                `json:"cost_multi"`
	MultiCount   int                `json:"multi_count"`
	PityThreshold int               `json:"pity_threshold"`
	PityCounter  int                `json:"pity_counter"`
	Points       int                `json:"points"`
	Tickets      int                `json:"tickets"`
	TicketPrice  int                `json:"ticket_price"`
}

// Info returns the rate table, costs, and the caller's pity/balance.
func (h *SummonHandler) Info(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	var pity, tickets, points int
	if err := h.Pool.QueryRow(c.Request.Context(),
		`SELECT pity_counter, summon_tickets, current_points FROM users WHERE id=$1`, uid).
		Scan(&pity, &tickets, &points); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, summonInfo{
		Rates:        map[string]float64{"LEGENDARY": 0.03, "EPIC": 0.09, "RARE": 0.28, "COMMON": 0.60},
		PickupRates:  map[string]float64{"LEGENDARY": 0.06, "EPIC": 0.09, "RARE": 0.28, "COMMON": 0.57},
		CostSingle:   game.SummonCostSingle,
		CostMulti:    game.SummonCostMulti,
		MultiCount:   game.SummonMultiCount,
		PityThreshold: game.PityThreshold,
		PityCounter:  pity,
		Points:       points,
		Tickets:      tickets,
		TicketPrice:  ticketPrice,
	})
}

type collectionResp struct {
	Catalog []*models.Character      `json:"catalog"`
	Owned   []*models.OwnedCharacter `json:"owned"`
}

// Collection returns the full catalog plus the user's owned characters (도감).
func (h *SummonHandler) Collection(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	ctx := c.Request.Context()
	catalog, err := h.Characters.ListCatalog(ctx)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	owned, err := h.Characters.ListOwned(ctx, uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, collectionResp{Catalog: catalog, Owned: owned})
}

type drawReq struct {
	Count    int    `json:"count"`     // 1 or 10
	CostType string `json:"cost_type"` // POINTS | TICKET
}

// Draw performs a single or 10-pull summon (FR-SUMMON-01~05).
func (h *SummonHandler) Draw(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *drawReq) error {
		if r.Count != 1 && r.Count != game.SummonMultiCount {
			return errors.New("count must be 1 or 10")
		}
		if r.CostType == "" {
			r.CostType = "POINTS"
		}
		if r.CostType != "POINTS" && r.CostType != "TICKET" {
			return errors.New("invalid cost_type")
		}
		return nil
	})
	if !ok {
		return
	}

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer tx.Rollback(ctx)

	var points, tickets, pity int
	if err := tx.QueryRow(ctx,
		`SELECT current_points, summon_tickets, pity_counter FROM users WHERE id=$1 FOR UPDATE`, uid).
		Scan(&points, &tickets, &pity); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	costPoints, costTickets := 0, 0
	if req.CostType == "TICKET" {
		costTickets = req.Count // 1 ticket per pull
		if tickets < costTickets {
			RespondErr(c, http.StatusBadRequest, "INSUFFICIENT_TICKETS", "소환권이 부족합니다.")
			return
		}
	} else {
		if req.Count == game.SummonMultiCount {
			costPoints = game.SummonCostMulti
		} else {
			costPoints = game.SummonCostSingle
		}
		if points < costPoints {
			RespondErr(c, http.StatusBadRequest, "INSUFFICIENT_POINTS", "포인트가 부족합니다.")
			return
		}
	}

	// Roll rarities for the whole batch (pity-aware + 10-pull RARE+ guarantee).
	rarities, endPity := rollBatch(req.Count, pity)

	draws := make([]models.SummonDraw, 0, req.Count)
	refundTotal := 0
	for i, rar := range rarities {
		ch, err := h.Characters.RandomByRarityTx(ctx, tx, rar)
		if err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		isNew, err := h.Characters.GrantTx(ctx, tx, uid, ch.ID)
		if err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		refund := 0
		if !isNew {
			refund = game.DuplicateRefund(rar)
			refundTotal += refund
		}
		if err := h.Characters.LogSummonTx(ctx, tx, uid, ch.ID, req.CostType, pity+i); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		draws = append(draws, models.SummonDraw{Character: *ch, IsNew: isNew, RefundPoints: refund})
	}

	// Persist balances + pity.
	newPoints := points - costPoints + refundTotal
	newTickets := tickets - costTickets
	if _, err := tx.Exec(ctx,
		`UPDATE users SET current_points=$1, summon_tickets=$2, pity_counter=$3, updated_at=now() WHERE id=$4`,
		newPoints, newTickets, endPity, uid); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if err := tx.Commit(ctx); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	Respond(c, http.StatusOK, models.SummonResult{
		Draws:            draws,
		SpentPoints:      costPoints,
		SpentTickets:     costTickets,
		RefundedPoints:   refundTotal,
		RemainingPoints:  newPoints,
		RemainingTickets: newTickets,
		PityCounter:      endPity,
	})
}

// rollBatch returns the rarity of each pull plus the resulting pity counter.
// Pity (90) forces LEGENDARY; a 10-pull guarantees at least one RARE+.
func rollBatch(count, startPity int) (rarities []string, endPity int) {
	pity := startPity
	for i := 0; i < count; i++ {
		var rar string
		if pity >= game.PityThreshold {
			rar = "LEGENDARY"
		} else {
			rar = game.RollRarity(rand.Float64(), true) // 픽업 배너 상시 적용
		}
		if rar == "LEGENDARY" {
			pity = 0
		} else {
			pity++
		}
		rarities = append(rarities, rar)
	}
	if count >= game.SummonMultiCount {
		hasRarePlus := false
		for _, r := range rarities {
			if game.RarityRank(r) >= 1 {
				hasRarePlus = true
				break
			}
		}
		if !hasRarePlus {
			rarities[len(rarities)-1] = "RARE"
		}
	}
	return rarities, pity
}

type equipCharacterReq struct {
	CharacterID string `json:"character_id"`
}

// Equip sets the user's single active character (FR-SUMMON-04).
func (h *SummonHandler) Equip(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *equipCharacterReq) error {
		if r.CharacterID == "" {
			return errors.New("character_id required")
		}
		return nil
	})
	if !ok {
		return
	}
	cid, err := uuid.Parse(req.CharacterID)
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid character_id")
		return
	}
	ctx := c.Request.Context()
	owns, err := h.Characters.OwnsCharacter(ctx, uid, cid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if !owns {
		RespondErr(c, http.StatusForbidden, "NOT_OWNED", "보유하지 않은 캐릭터입니다.")
		return
	}
	if err := h.Characters.SetActive(ctx, uid, cid); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, okResponse{OK: true})
}

type buyTicketReq struct {
	Count int `json:"count"`
}

// BuyTickets exchanges points for summon tickets (FR-SUMMON-05).
func (h *SummonHandler) BuyTickets(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *buyTicketReq) error {
		if r.Count <= 0 || r.Count > 100 {
			return errors.New("count must be 1..100")
		}
		return nil
	})
	if !ok {
		return
	}
	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer tx.Rollback(ctx)
	cost := req.Count * ticketPrice
	var points int
	if err := tx.QueryRow(ctx, `SELECT current_points FROM users WHERE id=$1 FOR UPDATE`, uid).Scan(&points); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if points < cost {
		RespondErr(c, http.StatusBadRequest, "INSUFFICIENT_POINTS", "포인트가 부족합니다.")
		return
	}
	if _, err := tx.Exec(ctx,
		`UPDATE users SET current_points=current_points-$1, summon_tickets=summon_tickets+$2, updated_at=now() WHERE id=$3`,
		cost, req.Count, uid); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if err := tx.Commit(ctx); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	var tickets, remaining int
	_ = h.Pool.QueryRow(ctx, `SELECT summon_tickets, current_points FROM users WHERE id=$1`, uid).Scan(&tickets, &remaining)
	Respond(c, http.StatusOK, gin.H{"tickets": tickets, "remaining_points": remaining})
}
