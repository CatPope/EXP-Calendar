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
	uid := middleware.MustUserID(c)
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
	uid := middleware.MustUserID(c)
	var req createScheduleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	if req.Title == "" {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "title required")
		return
	}
	if req.Difficulty == "" {
		req.Difficulty = "MEDIUM"
	}
	switch req.Difficulty {
	case "LOW", "MEDIUM", "HIGH":
	default:
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid difficulty")
		return
	}
	if req.DueDate.IsZero() {
		req.DueDate = timeNow().Add(24 * time.Hour)
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
	uid := middleware.MustUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid id")
		return
	}
	var patch map[string]any
	if err := c.ShouldBindJSON(&patch); err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}
	// translate due_date string→time if needed
	if v, ok := patch["due_date"].(string); ok && v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			patch["due_date"] = t
		}
	}
	s, err := h.Schedules.Update(c.Request.Context(), uid, id, patch)
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
	uid := middleware.MustUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid id")
		return
	}
	if err := h.Schedules.Delete(c.Request.Context(), uid, id); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{"ok": true})
}

type completeResult struct {
	Schedule *models.Schedule `json:"schedule"`
	Reward   gin.H            `json:"reward"`
}

func (h *SchedulesHandler) Complete(c *gin.Context) {
	uid := middleware.MustUserID(c)
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
	uCurrent, err := getUserTx(ctx, tx, uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// 3) apply cap on points; EXP is full
	ptsGranted, capReached := game.ApplyDailyCap(uCurrent.DailyPointsEarned, ptsGross)

	// 4) update totals
	newTotalExp := uCurrent.TotalExp + expGain
	newLevel := game.LevelFromExp(newTotalExp)
	if _, err := tx.Exec(ctx,
		`UPDATE users SET total_exp=$1, level=$2, current_points=current_points+$3,
		 daily_points_earned=daily_points_earned+$3, updated_at=now() WHERE id=$4`,
		newTotalExp, newLevel, ptsGranted, uid); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// 5) reward_log
	scheduleID := id
	if err := h.Rewards.LogTx(ctx, tx, uid, &scheduleID, "SCHEDULE", expGain, ptsGranted); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// 6) level-up titles
	newTitles := []*models.Title{}
	for _, name := range game.TitlesUnlockedBetween(uCurrent.Level, newLevel) {
		t, granted, err := h.Titles.GrantTitleByName(ctx, tx, uid, name)
		if err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		if granted {
			newTitles = append(newTitles, t)
		}
	}

	// 7) COMPLETE_PLAN quest auto-complete (any 1 completion today)
	if _, _, err := h.Quests.MarkCompletedTx(ctx, tx, uid, today, "COMPLETE_PLAN"); err != nil {
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
		Reward: gin.H{
			"exp_gained":        expGain,
			"points_gained":     ptsGranted,
			"level_up":          newLevel > uCurrent.Level,
			"new_level":         levelOrNil(uCurrent.Level, newLevel),
			"new_titles":        newTitles,
			"daily_cap_reached": capReached,
		},
	})
}

func levelOrNil(oldLvl, newLvl int) any {
	if newLvl > oldLvl {
		return newLvl
	}
	return nil
}

// getUserTx is a tx-aware mini reader to read user state within an open tx.
func getUserTx(ctx context.Context, tx pgx.Tx, id uuid.UUID) (*models.User, error) {
	row := tx.QueryRow(ctx,
		`SELECT id, email, display_name, google_sub, account_status, level,
		 total_exp, current_points, daily_points_earned, daily_points_earned_date,
		 tendency, persona_character_type, persona_showcase_text, persona_llm_output,
		 created_at, updated_at FROM users WHERE id=$1`, id)
	var u models.User
	if err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &u.GoogleSub, &u.AccountStatus, &u.Level,
		&u.TotalExp, &u.CurrentPoints, &u.DailyPointsEarned, &u.DailyPointsEarnedDate,
		&u.Tendency, &u.PersonaCharacterType, &u.PersonaShowcaseText, &u.PersonaLLMOutput,
		&u.CreatedAt, &u.UpdatedAt); err != nil {
		return nil, err
	}
	return &u, nil
}
