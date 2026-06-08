package handlers

import (
	"context"
	"net/http"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SettingsHandler implements the unified settings, data export and account reset
// endpoints (SRS v1.3 §3.2.10, FR-SET-01/03/06).
type SettingsHandler struct {
	Pool     *pgxpool.Pool
	Settings *repo.SettingsRepo
	Users    *repo.UserRepo
}

func NewSettingsHandler(p *pgxpool.Pool, s *repo.SettingsRepo, u *repo.UserRepo) *SettingsHandler {
	return &SettingsHandler{Pool: p, Settings: s, Users: u}
}

// Get returns the caller's settings (creating defaults on first access).
func (h *SettingsHandler) Get(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	s, err := h.Settings.Get(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, s)
}

// Patch applies a partial settings update.
func (h *SettingsHandler) Patch(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	patch, ok := BindAndValidate[map[string]any](c, nil)
	if !ok {
		return
	}
	s, err := h.Settings.Update(c.Request.Context(), uid, *patch)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, s)
}

// Export returns a JSON snapshot of the user's data (FR-SET-03 데이터 내보내기).
func (h *SettingsHandler) Export(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	ctx := c.Request.Context()
	export := gin.H{}

	if u, err := h.Users.GetByID(ctx, uid); err == nil {
		export["profile"] = u
	}
	if s, err := h.Settings.Get(ctx, uid); err == nil {
		export["settings"] = s
	}
	export["schedules"] = collectJSON(ctx, h.Pool,
		`SELECT title, description, difficulty, status, due_date, completed_at, created_at
		 FROM schedules WHERE user_id=$1 ORDER BY created_at`, uid)
	export["titles"] = collectJSON(ctx, h.Pool,
		`SELECT t.name, t.grade, ut.is_equipped, ut.is_displayed, ut.negative_modifier, ut.acquired_at
		 FROM user_titles ut JOIN titles t ON t.id=ut.title_id WHERE ut.user_id=$1`, uid)
	export["characters"] = collectJSON(ctx, h.Pool,
		`SELECT c.name, c.rarity, uc.count, uc.acquired_at
		 FROM user_characters uc JOIN characters c ON c.id=uc.character_id WHERE uc.user_id=$1`, uid)
	export["purchases"] = collectJSON(ctx, h.Pool,
		`SELECT i.name, p.price_paid, p.purchased_at
		 FROM purchases p JOIN items i ON i.id=p.item_id WHERE p.user_id=$1`, uid)

	c.Header("Content-Disposition", "attachment; filename=exp-calendar-export.json")
	Respond(c, http.StatusOK, export)
}

// collectJSON runs a query and returns rows as []map (best-effort; nil on error).
func collectJSON(ctx context.Context, pool *pgxpool.Pool, sql string, args ...any) []map[string]any {
	rows, err := pool.Query(ctx, sql, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []map[string]any{}
	fields := rows.FieldDescriptions()
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return out
		}
		m := map[string]any{}
		for i, f := range fields {
			m[string(f.Name)] = vals[i]
		}
		out = append(out, m)
	}
	return out
}

// Reset wipes the caller's gameplay data irreversibly (FR-SET-03 계정/데이터 초기화).
// The account row itself is kept so the session stays valid, but all progress,
// collection, schedules and settings are cleared.
func (h *SettingsHandler) Reset(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	defer tx.Rollback(ctx)

	// Detach FK before deleting characters.
	if _, err := tx.Exec(ctx, `UPDATE users SET active_character_id=NULL WHERE id=$1`, uid); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	for _, q := range []string{
		`DELETE FROM reward_log WHERE user_id=$1`,
		`DELETE FROM summon_log WHERE user_id=$1`,
		`DELETE FROM user_characters WHERE user_id=$1`,
		`DELETE FROM purchases WHERE user_id=$1`,
		`DELETE FROM user_titles WHERE user_id=$1`,
		`DELETE FROM quest_log WHERE user_id=$1`,
		`DELETE FROM schedules WHERE user_id=$1`,
		`DELETE FROM user_settings WHERE user_id=$1`,
	} {
		if _, err := tx.Exec(ctx, q, uid); err != nil {
			RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
	}
	if _, err := tx.Exec(ctx,
		`UPDATE users SET level=1, total_exp=0, current_points=0, daily_points_earned=0,
		   summon_tickets=0, pity_counter=0, overdue_count=0, last_quest_bonus_date=NULL,
		   persona_definition='', persona_tokens=0, persona_showcase_text='', persona_llm_output='',
		   updated_at=now() WHERE id=$1`, uid); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if err := tx.Commit(ctx); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, okResponse{OK: true})
}
