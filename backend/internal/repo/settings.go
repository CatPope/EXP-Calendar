package repo

import (
	"context"
	"encoding/json"

	"github.com/expcalendar/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SettingsRepo persists the unified user settings (FR-SET-01~06).
type SettingsRepo struct{ Pool *pgxpool.Pool }

func NewSettingsRepo(p *pgxpool.Pool) *SettingsRepo { return &SettingsRepo{Pool: p} }

func defaultPrefs() map[string]bool {
	return map[string]bool{
		"push":              true,
		"schedule_reminder": true,
		"dormancy_warning":  true,
		"title_change":      true,
		"daily_quest_reset": false,
	}
}

// Get returns the user's settings, creating defaults on first access.
func (r *SettingsRepo) Get(ctx context.Context, userID uuid.UUID) (*models.Settings, error) {
	// Ensure a row exists (idempotent).
	if _, err := r.Pool.Exec(ctx,
		`INSERT INTO user_settings(user_id) VALUES($1) ON CONFLICT (user_id) DO NOTHING`, userID); err != nil {
		return nil, err
	}
	row := r.Pool.QueryRow(ctx,
		`SELECT language, timezone, week_start, time_format, theme, character_scale,
		        gcal_sync_enabled, notification_prefs, reminder_minutes
		 FROM user_settings WHERE user_id=$1`, userID)
	s := &models.Settings{}
	var prefsRaw []byte
	if err := row.Scan(&s.Language, &s.Timezone, &s.WeekStart, &s.TimeFormat, &s.Theme,
		&s.CharacterScale, &s.GcalSyncEnabled, &prefsRaw, &s.ReminderMinutes); err != nil {
		return nil, err
	}
	s.NotificationPrefs = defaultPrefs()
	if len(prefsRaw) > 0 {
		_ = json.Unmarshal(prefsRaw, &s.NotificationPrefs)
	}
	return s, nil
}

// Update applies a partial settings patch (only provided fields). Whitelisted.
func (r *SettingsRepo) Update(ctx context.Context, userID uuid.UUID, patch map[string]any) (*models.Settings, error) {
	if _, err := r.Pool.Exec(ctx,
		`INSERT INTO user_settings(user_id) VALUES($1) ON CONFLICT (user_id) DO NOTHING`, userID); err != nil {
		return nil, err
	}
	cols := map[string]bool{
		"language": true, "timezone": true, "week_start": true, "time_format": true,
		"theme": true, "character_scale": true, "gcal_sync_enabled": true, "reminder_minutes": true,
	}
	for k, v := range patch {
		if k == "notification_prefs" {
			raw, err := json.Marshal(v)
			if err != nil {
				continue
			}
			if _, err := r.Pool.Exec(ctx,
				`UPDATE user_settings SET notification_prefs=$1, updated_at=now() WHERE user_id=$2`, raw, userID); err != nil {
				return nil, err
			}
			continue
		}
		if !cols[k] {
			continue
		}
		if _, err := r.Pool.Exec(ctx,
			`UPDATE user_settings SET `+k+`=$1, updated_at=now() WHERE user_id=$2`, v, userID); err != nil {
			return nil, err
		}
	}
	return r.Get(ctx, userID)
}
