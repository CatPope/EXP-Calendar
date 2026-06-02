package handlers

import (
	"net/http"
	"time"

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

type questCompleteResponse struct {
	Completed     bool `json:"completed"`
	RewardPoints  int  `json:"reward_points"`
	BonusPoints   int  `json:"bonus_points"`
	StreakMult    int  `json:"streak_mult"`
	CurrentPoints int  `json:"current_points"`
}

func (h *QuestsHandler) Today(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
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
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
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

	changed, _, err := h.Quests.MarkCompletedTx(ctx, tx, uid, today, qt)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// Streak multiplier (FR-GAME-06): 7+ consecutive all-quests days → ×2.
	streak, _ := h.Quests.AllQuestsStreak(ctx, uid, today)
	mult := game.QuestStreakMultiplier(streak)

	// grantPoints applies the daily cap and persists, returning the amount granted.
	grantPoints := func(gross int) (int, error) {
		u, err := h.Users.GetByIDTx(ctx, tx, uid)
		if err != nil {
			return 0, err
		}
		gp, _ := game.ApplyDailyCap(u.DailyPointsEarned, gross)
		if gp > 0 {
			if _, err := tx.Exec(ctx,
				`UPDATE users SET current_points=current_points+$1, daily_points_earned=daily_points_earned+$1, updated_at=now() WHERE id=$2`,
				gp, uid); err != nil {
				return 0, err
			}
		}
		return gp, nil
	}

	granted := 0
	if changed {
		if granted, err = grantPoints(game.QuestRewardPoints(qt) * mult); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}

	// All-3-complete bonus (FR-GAME-06), once per day.
	bonus := 0
	allDone, err := h.Quests.AllCompletedTx(ctx, tx, uid, today)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if allDone {
		var bonusDate *time.Time
		if err := tx.QueryRow(ctx, `SELECT last_quest_bonus_date FROM users WHERE id=$1`, uid).Scan(&bonusDate); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		todayStr := today.Format("2006-01-02")
		if bonusDate == nil || bonusDate.Format("2006-01-02") != todayStr {
			if bonus, err = grantPoints(game.AllQuestsBonusPoints() * mult); err != nil {
				RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
				return
			}
			if _, err := tx.Exec(ctx, `UPDATE users SET last_quest_bonus_date=$1 WHERE id=$2`, todayStr, uid); err != nil {
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
	Respond(c, http.StatusOK, questCompleteResponse{
		Completed:     true,
		RewardPoints:  granted,
		BonusPoints:   bonus,
		StreakMult:    mult,
		CurrentPoints: final.CurrentPoints,
	})
}
