package handlers

import (
	"net/http"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TitlesHandler struct {
	Pool    *pgxpool.Pool
	Titles  *repo.TitleRepo
	Stats   *repo.StatsRepo
	Rewards *repo.RewardRepo
}

func NewTitlesHandler(pool *pgxpool.Pool, t *repo.TitleRepo, stats *repo.StatsRepo, rewards *repo.RewardRepo) *TitlesHandler {
	return &TitlesHandler{Pool: pool, Titles: t, Stats: stats, Rewards: rewards}
}

func (h *TitlesHandler) ListMine(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
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
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid id")
		return
	}
	req, ok := BindAndValidate[equipReq](c, nil)
	if !ok {
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

type useDefenseResponse struct {
	DefenseTickets int  `json:"defense_tickets"`
	Cleared        bool `json:"cleared"`
}

// UseDefense consumes one defense ticket from the caller's inventory and clears
// the best candidate penalized title (FR-TITLE-04 / DC-07).
func (h *TitlesHandler) UseDefense(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}

	ctx := c.Request.Context()
	tx, err := h.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer tx.Rollback(ctx)

	// Read current ticket count with row lock.
	var tickets int
	if err := tx.QueryRow(ctx,
		`SELECT defense_tickets FROM users WHERE id=$1 FOR UPDATE`, uid).Scan(&tickets); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if tickets <= 0 {
		RespondErr(c, http.StatusBadRequest, "NO_DEFENSE_TICKET", "보유한 방어권이 없습니다")
		return
	}

	// Find the best penalized title to recover.
	targetID, err := h.Titles.FindPenalizedTitleIDTx(ctx, tx, uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if targetID == uuid.Nil {
		// No penalized title — nothing to clear, ticket retained.
		if err := tx.Commit(ctx); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		Respond(c, http.StatusOK, useDefenseResponse{DefenseTickets: tickets, Cleared: false})
		return
	}

	// Clear the penalty and decrement the ticket count.
	if err := h.Titles.ClearNegativeModifierByIDTx(ctx, tx, targetID); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	var newTickets int
	if err := tx.QueryRow(ctx,
		`UPDATE users SET defense_tickets=defense_tickets-1 WHERE id=$1 RETURNING defense_tickets`, uid).Scan(&newTickets); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if err := tx.Commit(ctx); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	Respond(c, http.StatusOK, useDefenseResponse{DefenseTickets: newTickets, Cleared: true})
}

// ListAll returns every master title with the caller's ownership status and
// progress toward each unlock condition (GET /api/titles/all, v1.4).
func (h *TitlesHandler) ListAll(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	ctx := c.Request.Context()

	// Compute the caller's current streak then build the full TitleProgress.
	streak, _ := h.Rewards.ConsecutiveCompletionDays(ctx, uid, kstToday(), 120)
	prog, err := h.Stats.Progress(ctx, uid, streak)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// Fetch every master title (with its raw condition string).
	all, err := h.Titles.ListAllWithCondition(ctx)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// Fetch the caller's owned titles and build a lookup by master title ID.
	type ownedEntry struct {
		IsEquipped       bool
		IsDisplayed      bool
		NegativeModifier *string
	}
	ownedRows, err := h.Titles.ListUserTitles(ctx, uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	ownedMap := make(map[uuid.UUID]ownedEntry, len(ownedRows))
	for _, ut := range ownedRows {
		ownedMap[ut.Title.ID] = ownedEntry{
			IsEquipped:       ut.IsEquipped,
			IsDisplayed:      ut.IsDisplayed,
			NegativeModifier: ut.NegativeModifier,
		}
	}

	// Build the catalog, owned titles first, then unowned in master order.
	owned := make([]models.TitleCatalogEntry, 0)
	unowned := make([]models.TitleCatalogEntry, 0)
	for _, twc := range all {
		kind, current, threshold := prog.ProgressFor(twc.Condition)
		if threshold > 0 && current > threshold {
			current = threshold
		}
		entry := models.TitleCatalogEntry{
			Title:             *twc.Title,
			ConditionKind:     kind,
			ProgressCurrent:   current,
			ProgressThreshold: threshold,
		}
		if oe, has := ownedMap[twc.Title.ID]; has {
			entry.Owned = true
			entry.IsEquipped = oe.IsEquipped
			entry.IsDisplayed = oe.IsDisplayed
			entry.NegativeModifier = oe.NegativeModifier
			owned = append(owned, entry)
		} else {
			unowned = append(unowned, entry)
		}
	}

	out := append(owned, unowned...)
	Respond(c, http.StatusOK, out)
}
