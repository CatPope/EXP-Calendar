package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
)

type StatsHandler struct {
	Rewards *repo.RewardRepo
	Stats   *repo.StatsRepo
}

func NewStatsHandler(r *repo.RewardRepo, s *repo.StatsRepo) *StatsHandler {
	return &StatsHandler{Rewards: r, Stats: s}
}

// Summary returns the caller's rating grade and streaks (FR-STAT-03/05).
func (h *StatsHandler) Summary(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	ctx := c.Request.Context()
	current, _ := h.Rewards.ConsecutiveCompletionDays(ctx, uid, kstToday(), 120)
	summary, err := h.Stats.SummaryFull(ctx, uid, current)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, summary)
}

func (h *StatsHandler) Grass(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	days := 365
	if v := c.Query("days"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 730 {
			days = n
		}
	}
	to := timeNow().AddDate(0, 0, 1)
	from := to.AddDate(0, 0, -days)
	out, err := h.Rewards.GrassByDay(c.Request.Context(), uid, from, to)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if out == nil {
		out = map[string]int{}
	}
	Respond(c, http.StatusOK, out)
}

func (h *StatsHandler) Series(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	period := c.DefaultQuery("period", "week")
	// Period semantics:
	//   week : last 7 days       (daily buckets)
	//   month: last 12 months    (monthly buckets)
	//   year : last 10 years     (yearly buckets)
	kstLoc := kstLocation()
	nowKST := timeNow().In(kstLoc)
	to := time.Date(nowKST.Year(), nowKST.Month(), nowKST.Day()+1, 0, 0, 0, 0, kstLoc)
	from, granularity := periodWindow(period, to)
	out, err := h.Rewards.SeriesAggregated(c.Request.Context(), uid, from, to, granularity)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if out == nil {
		out = []map[string]any{}
	}
	Respond(c, http.StatusOK, out)
}
