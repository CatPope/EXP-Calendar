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
	Rewards   *repo.RewardRepo
}

func NewQuestsHandler(p *pgxpool.Pool, q *repo.QuestRepo, u *repo.UserRepo, s *repo.ScheduleRepo, r *repo.RewardRepo) *QuestsHandler {
	return &QuestsHandler{Pool: p, Quests: q, Users: u, Schedules: s, Rewards: r}
}

type questCompleteResponse struct {
	Completed     bool `json:"completed"`
	RewardPoints  int  `json:"reward_points"`
	BonusPoints   int  `json:"bonus_points"`
	StreakMult    int  `json:"streak_mult"`
	CurrentPoints int  `json:"current_points"`
}

type questClaimResponse struct {
	Claimed       bool `json:"claimed"`
	RewardPoints  int  `json:"reward_points"`
	BonusPoints   int  `json:"bonus_points"`
	StreakMult    int  `json:"streak_mult"`
	CurrentPoints int  `json:"current_points"`
}

// AwardQuestAuto marks a quest completed (detection path only). Reward granting
// is deferred to the explicit Claim handler. Idempotent: marking an already-
// completed quest is a no-op. Safe to call from schedule add/complete, showcase
// visit, and quest list refresh. Returns granted=0, bonus=0, and the current
// streak multiplier so callers that inspect those values still compile.
func AwardQuestAuto(ctx context.Context, quests *repo.QuestRepo, users *repo.UserRepo, uid uuid.UUID, today time.Time, questType string) (granted, bonus, mult int, err error) {
	tx, err := users.Pool.Begin(ctx)
	if err != nil {
		return 0, 0, 1, err
	}
	defer tx.Rollback(ctx)

	_, _, err = quests.MarkCompletedTx(ctx, tx, uid, today, questType)
	if err != nil {
		return 0, 0, 1, err
	}

	streak, _ := quests.AllQuestsStreak(ctx, uid, today)
	mult = game.QuestStreakMultiplier(streak)

	if err = tx.Commit(ctx); err != nil {
		return 0, 0, mult, err
	}
	return 0, 0, mult, nil
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

// Claim grants the reward for a completed-but-unclaimed daily quest.
// POST /api/quests/:quest_type/claim
// The quest must be completed (auto-detected) before it can be claimed.
// Idempotent with respect to double-claiming: a second call returns ALREADY_CLAIMED.
func (h *QuestsHandler) Claim(c *gin.Context) {
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
	today := kstToday()

	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer tx.Rollback(ctx)

	// Reset daily cap counter if a new KST day has started.
	if err = h.Users.ResetDailyPointsIfNeeded(ctx, tx, uid, today); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// Mark this quest as claimed (or detect already-claimed / not-completed).
	completed, alreadyClaimed, err := h.Quests.ClaimTx(ctx, tx, uid, today, qt)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if !completed {
		RespondErr(c, http.StatusBadRequest, "QUEST_NOT_COMPLETE", "quest is not completed yet")
		return
	}
	if alreadyClaimed {
		RespondErr(c, http.StatusBadRequest, "ALREADY_CLAIMED", "quest reward already claimed")
		return
	}

	// Compute streak multiplier.
	streak, _ := h.Quests.AllQuestsStreak(ctx, uid, today)
	mult := game.QuestStreakMultiplier(streak)

	// Helper: apply daily cap, update user balances, return actual granted amount.
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

	// Grant per-quest reward.
	perQuestGranted, err := grantPoints(game.QuestRewardPoints(qt) * mult)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// Check if all three quests are now claimed → all-quests bonus.
	bonusGranted := 0
	allClaimed, err := h.Quests.AllClaimedTx(ctx, tx, uid, today)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if allClaimed {
		var bonusDate *time.Time
		if err = tx.QueryRow(ctx, `SELECT last_quest_bonus_date FROM users WHERE id=$1`, uid).Scan(&bonusDate); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		todayStr := today.Format("2006-01-02")
		if bonusDate == nil || bonusDate.Format("2006-01-02") != todayStr {
			if bonusGranted, err = grantPoints(game.AllQuestsBonusPoints() * mult); err != nil {
				RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
				return
			}
			if _, err = tx.Exec(ctx, `UPDATE users SET last_quest_bonus_date=$1 WHERE id=$2`, todayStr, uid); err != nil {
				RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
				return
			}
		}
	}

	// Write reward_log so Stats reflect quest activity.
	totalGranted := perQuestGranted + bonusGranted
	if err = h.Rewards.LogTx(ctx, tx, uid, nil, "QUEST", 0, totalGranted); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	if err = tx.Commit(ctx); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	final, _ := h.Users.GetByID(ctx, uid)
	Respond(c, http.StatusOK, questClaimResponse{
		Claimed:       true,
		RewardPoints:  perQuestGranted,
		BonusPoints:   bonusGranted,
		StreakMult:    mult,
		CurrentPoints: final.CurrentPoints,
	})
}
