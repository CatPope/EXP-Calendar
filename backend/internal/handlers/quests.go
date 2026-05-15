package handlers

import (
	"net/http"

	"github.com/expcalendar/backend/internal/game"
	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type QuestsHandler struct {
	Pool      *pgxpool.Pool
	Quests    *repo.QuestRepo
	Users     *repo.UserRepo
	Schedules *repo.ScheduleRepo
}

func NewQuestsHandler(p *pgxpool.Pool, q *repo.QuestRepo, u *repo.UserRepo, s *repo.ScheduleRepo) *QuestsHandler {
	return &QuestsHandler{Pool: p, Quests: q, Users: u, Schedules: s}
}

func (h *QuestsHandler) Today(c *gin.Context) {
	uid := middleware.MustUserID(c)
	today := kstToday()
	// Pre-evaluate auto-completions before listing.
	if n, _ := h.Schedules.CountAddedOn(c.Request.Context(), uid, today); n >= 2 {
		_, _, _ = h.Quests.MarkCompleted(c.Request.Context(), uid, today, "ADD_PLAN")
	}
	if n, _ := h.Schedules.CountCompletedOn(c.Request.Context(), uid, today); n >= 1 {
		_, _, _ = h.Quests.MarkCompleted(c.Request.Context(), uid, today, "COMPLETE_PLAN")
	}
	rows, err := h.Quests.EnsureToday(c.Request.Context(), uid, today)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, rows)
}

func (h *QuestsHandler) Complete(c *gin.Context) {
	uid := middleware.MustUserID(c)
	qt := c.Param("quest_type")
	switch qt {
	case "ADD_PLAN", "COMPLETE_PLAN", "VISIT_SHOWCASE":
	default:
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid quest_type")
		return
	}
	today := kstToday()

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer tx.Rollback(ctx)

	if err := h.Users.ResetDailyPointsIfNeeded(ctx, tx, uid, today); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	changed, reward, err := h.Quests.MarkCompletedTx(ctx, tx, uid, today, qt)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// Always re-read current user state.
	u, err := getUserTx(ctx, tx, uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	granted := 0
	if changed && reward > 0 {
		gp, _ := game.ApplyDailyCap(u.DailyPointsEarned, reward)
		granted = gp
		if gp > 0 {
			if _, err := tx.Exec(ctx,
				`UPDATE users SET current_points=current_points+$1, daily_points_earned=daily_points_earned+$1, updated_at=now() WHERE id=$2`,
				gp, uid); err != nil {
				RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
				return
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	final, _ := h.Users.GetByID(ctx, uid)
	Respond(c, http.StatusOK, gin.H{
		"completed":      true,
		"reward_points":  granted,
		"current_points": final.CurrentPoints,
	})
}
