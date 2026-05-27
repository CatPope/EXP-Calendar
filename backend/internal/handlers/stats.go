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
}

func NewStatsHandler(r *repo.RewardRepo) *StatsHandler { return &StatsHandler{Rewards: r} }

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
	var from, to time.Time
	now := timeNow()
	to = time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
	switch period {
	case "week":
		from = to.AddDate(0, 0, -7)
	case "month":
		from = to.AddDate(0, -1, 0)
	case "year":
		from = to.AddDate(-1, 0, 0)
	default:
		from = to.AddDate(0, 0, -7)
	}
	out, err := h.Rewards.SeriesByDay(c.Request.Context(), uid, from, to)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if out == nil {
		out = []map[string]any{}
	}
	Respond(c, http.StatusOK, out)
}
