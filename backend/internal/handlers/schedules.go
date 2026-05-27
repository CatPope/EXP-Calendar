package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/expcalendar/backend/internal/game"
	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SchedulesHandler struct {
	Pool      *pgxpool.Pool
	Users     *repo.UserRepo
	Schedules *repo.ScheduleRepo
	Titles    *repo.TitleRepo
	Quests    *repo.QuestRepo
	Rewards   *repo.RewardRepo
}

func NewSchedulesHandler(pool *pgxpool.Pool, u *repo.UserRepo, s *repo.ScheduleRepo, t *repo.TitleRepo, q *repo.QuestRepo, r *repo.RewardRepo) *SchedulesHandler {
	return &SchedulesHandler{Pool: pool, Users: u, Schedules: s, Titles: t, Quests: q, Rewards: r}
}

type createScheduleReq struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Difficulty  string    `json:"difficulty"`
	DueDate     time.Time `json:"due_date"`
}

func (h *SchedulesHandler) List(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	fromStr := c.Query("from")
	toStr := c.Query("to")
	now := timeNow()
	from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 3, 0)
	if fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t.AddDate(0, 0, 1)
		}
	}
	items, err := h.Schedules.ListInRange(c.Request.Context(), uid, from, to)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, items)
}

func (h *SchedulesHandler) Create(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *createScheduleReq) error {
		if r.Title == "" {
			return errors.New("title required")
		}
		if r.Difficulty == "" {
			r.Difficulty = "MEDIUM"
		}
		switch r.Difficulty {
		case "LOW", "MEDIUM", "HIGH":
		default:
			return errors.New("invalid difficulty")
		}
		if r.DueDate.IsZero() {
			r.DueDate = timeNow().Add(24 * time.Hour)
		}
		return nil
	})
	if !ok {
		return
	}
	s, err := h.Schedules.Create(c.Request.Context(), uid, req.Title, req.Description, req.Difficulty, req.DueDate)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	// Auto-complete ADD_PLAN quest if user added >=2 plans today.
	today := kstToday()
	if n, _ := h.Schedules.CountAddedOn(c.Request.Context(), uid, today); n >= 2 {
		_, _, _ = h.Quests.MarkCompleted(c.Request.Context(), uid, today, "ADD_PLAN")
	}
	Respond(c, http.StatusCreated, s)
}

func (h *SchedulesHandler) Patch(c *gin.Context) {
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
	patch, ok := BindAndValidate[map[string]any](c, nil)
	if !ok {
		return
	}
	// translate due_date string→time if needed
	if v, ok := (*patch)["due_date"].(string); ok && v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			(*patch)["due_date"] = t
		}
	}
	s, err := h.Schedules.Update(c.Request.Context(), uid, id, *patch)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			RespondErr(c, http.StatusNotFound, "NOT_FOUND", "schedule not found")
			return
		}
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, s)
}

func (h *SchedulesHandler) Delete(c *gin.Context) {
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
	if err := h.Schedules.Delete(c.Request.Context(), uid, id); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, okResponse{OK: true})
}

// completeReward is the legacy reward payload returned by POST /api/schedules/:id/complete.
// Keys are kept identical to the previous gin.H map to preserve the wire contract.
type completeReward struct {
	ExpGained       int             `json:"exp_gained"`
	PointsGained    int             `json:"points_gained"`
	LevelUp         bool            `json:"level_up"`
	NewLevel        any             `json:"new_level"`
	NewTitles       []*models.Title `json:"new_titles"`
	DailyCapReached bool            `json:"daily_cap_reached"`
}

type completeResult struct {
	Schedule *models.Schedule `json:"schedule"`
	Reward   completeReward   `json:"reward"`
}

func (h *SchedulesHandler) Complete(c *gin.Context) {
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

	ctx := c.Request.Context()
	now := timeNow()
	today := kstToday()

	// Load schedule + user upfront for reward calc.
	sched, err := h.Schedules.GetByID(ctx, uid, id)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "schedule not found")
		return
	}

	// Block completion before the due date arrives (KST date comparison).
	dueKST := sched.DueDate.In(today.Location())
	dueDay := time.Date(dueKST.Year(), dueKST.Month(), dueKST.Day(), 0, 0, 0, 0, today.Location())
	if dueDay.After(today) {
		RespondErr(c, http.StatusBadRequest, "NOT_YET_DUE", "예정일이 되기 전에는 완료할 수 없습니다.")
		return
	}

	u, err := h.Users.GetByID(ctx, uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	expGain, ptsGross := game.CalculateReward(sched.Difficulty, u.Level, u.Tendency)

	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer tx.Rollback(ctx)

	// 1) mark COMPLETED (idempotent guard)
	alreadyCompleted, err := h.Schedules.MarkCompletedTx(ctx, tx, uid, id, now)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if alreadyCompleted {
		RespondErr(c, http.StatusConflict, "ALREADY_COMPLETED", "schedule already completed")
		return
	}

	// 2) lazy reset daily points if needed
	if err := h.Users.ResetDailyPointsIfNeeded(ctx, tx, uid, today); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	// reload user inside tx to get reset state
	uCurrent, err := h.Users.GetByIDTx(ctx, tx, uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// 3) apply cap + 4) update totals + 5) log reward (in one helper)
	newLevel, ptsGranted, capReached, err := h.applyReward(ctx, tx, uid, id, uCurrent, expGain, ptsGross)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// 6) level-up titles
	newTitles, err := h.checkTitlesUnlocked(ctx, tx, uid, uCurrent.Level, newLevel)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// 7) COMPLETE_PLAN quest auto-complete (any 1 completion today)
	if err := h.checkQuestProgress(ctx, tx, uid, today); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	if err := tx.Commit(ctx); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// 8) 7-day streak check (outside tx; uses committed data)
	if streak, err := h.Rewards.ConsecutiveCompletionDays(ctx, uid, today, 14); err == nil && streak >= 7 {
		// grant "꾸준한 자"
		tx2, err := h.Pool.Begin(ctx)
		if err == nil {
			t, granted, err := h.Titles.GrantTitleByName(ctx, tx2, uid, "꾸준한 자")
			if err == nil && granted {
				newTitles = append(newTitles, t)
			}
			_ = tx2.Commit(ctx)
		}
	}

	// reload schedule for response
	sched, _ = h.Schedules.GetByID(ctx, uid, id)
	Respond(c, http.StatusOK, completeResult{
		Schedule: sched,
		Reward: completeReward{
			ExpGained:       expGain,
			PointsGained:    ptsGranted,
			LevelUp:         newLevel > uCurrent.Level,
			NewLevel:        levelOrNil(uCurrent.Level, newLevel),
			NewTitles:       newTitles,
			DailyCapReached: capReached,
		},
	})
}

// applyReward applies the daily-cap, persists the new EXP/points/level on the
// user row, and writes a reward_log entry. Returns the post-update level, the
// granted points, and the cap-reached flag.
func (h *SchedulesHandler) applyReward(
	ctx context.Context, tx pgx.Tx,
	uid, scheduleID uuid.UUID,
	current *models.User,
	expGain, ptsGross int,
) (newLevel, ptsGranted int, capReached bool, err error) {
	ptsGranted, capReached = game.ApplyDailyCap(current.DailyPointsEarned, ptsGross)
	newTotalExp := current.TotalExp + expGain
	newLevel = game.LevelFromExp(newTotalExp)
	if _, err = tx.Exec(ctx,
		`UPDATE users SET total_exp=$1, level=$2, current_points=current_points+$3,
		 daily_points_earned=daily_points_earned+$3, updated_at=now() WHERE id=$4`,
		newTotalExp, newLevel, ptsGranted, uid); err != nil {
		return 0, 0, false, err
	}
	sid := scheduleID
	if err = h.Rewards.LogTx(ctx, tx, uid, &sid, "SCHEDULE", expGain, ptsGranted); err != nil {
		return 0, 0, false, err
	}
	return newLevel, ptsGranted, capReached, nil
}

// checkTitlesUnlocked grants every master title whose unlock condition lies in
// the (oldLevel, newLevel] window. Returns the newly granted titles only.
func (h *SchedulesHandler) checkTitlesUnlocked(
	ctx context.Context, tx pgx.Tx,
	uid uuid.UUID, oldLevel, newLevel int,
) ([]*models.Title, error) {
	out := []*models.Title{}
	for _, name := range game.TitlesUnlockedBetween(oldLevel, newLevel) {
		t, granted, err := h.Titles.GrantTitleByName(ctx, tx, uid, name)
		if err != nil {
			return nil, err
		}
		if granted {
			out = append(out, t)
		}
	}
	return out, nil
}

// checkQuestProgress auto-completes COMPLETE_PLAN for the day (single completion
// is enough — see quest spec). Idempotent; safe to call multiple times.
func (h *SchedulesHandler) checkQuestProgress(
	ctx context.Context, tx pgx.Tx,
	uid uuid.UUID, day time.Time,
) error {
	_, _, err := h.Quests.MarkCompletedTx(ctx, tx, uid, day, "COMPLETE_PLAN")
	return err
}

func levelOrNil(oldLvl, newLvl int) any {
	if newLvl > oldLvl {
		return newLvl
	}
	return nil
}

// getUserTx is a backwards-compatible package-level shim. New code should call
// repo.UserRepo.GetByIDTx directly (via the handler's *UserRepo dep).
func getUserTx(ctx context.Context, tx pgx.Tx, id uuid.UUID) (*models.User, error) {
	return (&repo.UserRepo{}).GetByIDTx(ctx, tx, id)
}
