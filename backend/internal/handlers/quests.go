package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/expcalendar/backend/internal/game"
	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

// AwardQuestAuto marks a quest completed and grants its differential reward —
// with daily cap, the all-3 bonus (+50) and the 7-day streak ×2 multiplier — in a
// single transaction. Idempotent: a quest already completed grants nothing, and the
// all-3 bonus is granted at most once per day. Safe to call from any auto-complete
// site (schedule add/complete, showcase visit, quest list refresh). Returns the
// points actually granted, the bonus, and the streak multiplier.
func AwardQuestAuto(ctx context.Context, quests *repo.QuestRepo, users *repo.UserRepo, uid uuid.UUID, today time.Time, questType string) (granted, bonus, mult int, err error) {
	tx, err := users.Pool.Begin(ctx)
	if err != nil {
		return 0, 0, 1, err
	}
	defer tx.Rollback(ctx)

	if err = users.ResetDailyPointsIfNeeded(ctx, tx, uid, today); err != nil {
		return 0, 0, 1, err
	}
	changed, _, err := quests.MarkCompletedTx(ctx, tx, uid, today, questType)
	if err != nil {
		return 0, 0, 1, err
	}

	streak, _ := quests.AllQuestsStreak(ctx, uid, today)
	mult = game.QuestStreakMultiplier(streak)

	grantPoints := func(gross int) (int, error) {
		u, err := users.GetByIDTx(ctx, tx, uid)
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

	if changed {
		if granted, err = grantPoints(game.QuestRewardPoints(questType) * mult); err != nil {
			return 0, 0, mult, err
		}
	}

	allDone, err := quests.AllCompletedTx(ctx, tx, uid, today)
	if err != nil {
		return granted, 0, mult, err
	}
	if allDone {
		var bonusDate *time.Time
		if err = tx.QueryRow(ctx, `SELECT last_quest_bonus_date FROM users WHERE id=$1`, uid).Scan(&bonusDate); err != nil {
			return granted, 0, mult, err
		}
		todayStr := today.Format("2006-01-02")
		if bonusDate == nil || bonusDate.Format("2006-01-02") != todayStr {
			if bonus, err = grantPoints(game.AllQuestsBonusPoints() * mult); err != nil {
				return granted, 0, mult, err
			}
			if _, err = tx.Exec(ctx, `UPDATE users SET last_quest_bonus_date=$1 WHERE id=$2`, todayStr, uid); err != nil {
				return granted, bonus, mult, err
			}
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return granted, bonus, mult, err
	}
	return granted, bonus, mult, nil
}

// Today returns the 3 daily quests, auto-completing (and awarding) any whose
// condition is already met so the client never needs a manual "complete" action.
func (h *QuestsHandler) Today(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	ctx := c.Request.Context()
	today := kstToday()
	// Auto-award ADD_PLAN / COMPLETE_PLAN when today's conditions are met.
	if n, _ := h.Schedules.CountAddedOn(ctx, uid, today); n >= 2 {
		_, _, _, _ = AwardQuestAuto(ctx, h.Quests, h.Users, uid, today, "ADD_PLAN")
	}
	if n, _ := h.Schedules.CountCompletedOn(ctx, uid, today); n >= 1 {
		_, _, _, _ = AwardQuestAuto(ctx, h.Quests, h.Users, uid, today, "COMPLETE_PLAN")
	}
	rows, err := h.Quests.EnsureToday(ctx, uid, today)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, rows)
}

// Complete remains available as an explicit trigger (idempotent) but the client
// no longer needs it — quests auto-complete via AwardQuestAuto.
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
	ctx := c.Request.Context()
	granted, bonus, mult, err := AwardQuestAuto(ctx, h.Quests, h.Users, uid, kstToday(), qt)
	if err != nil {
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
