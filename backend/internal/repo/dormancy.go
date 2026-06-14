package repo

import (
	"context"
	"time"

	"github.com/expcalendar/backend/internal/game"
	"github.com/expcalendar/backend/internal/models"
	"github.com/google/uuid"
)

// MarkActive touches the user's last_active_at to "now". This is the heartbeat
// the dormancy worker uses to decide who has been inactive for ≥14 days
// (FR-DORM-01). Best-effort — non-fatal on error.
func (r *UserRepo) MarkActive(ctx context.Context, id uuid.UUID) error {
	_, err := r.Pool.Exec(ctx,
		`UPDATE users SET last_active_at = now() WHERE id = $1`, id)
	return err
}

// SweepDormant flips ACTIVE accounts whose last_active_at is older than the
// dormancy threshold (FR-DORM-01) to DORMANT, stamping dormant_since. Returns
// the number of users transitioned. Idempotent: already-DORMANT rows are
// skipped by the WHERE filter.
func (r *UserRepo) SweepDormant(ctx context.Context, now time.Time) (int, error) {
	threshold := now.Add(-time.Duration(game.DormancyThresholdDays) * 24 * time.Hour)
	tag, err := r.Pool.Exec(ctx,
		`UPDATE users
		    SET account_status = 'DORMANT',
		        dormant_since  = COALESCE(dormant_since, $1),
		        updated_at     = now()
		  WHERE account_status = 'ACTIVE'
		    AND last_active_at < $2`,
		now, threshold)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

// DormancyWarningCandidate represents one user who should receive the 13-day
// pre-dormancy warning push (FR-NOTI-03, FR-DORM-06).
type DormancyWarningCandidate struct {
	UserID   uuid.UUID
	Endpoint string
	P256dh   string
	Auth     string
}

// ListDormancyWarningCandidates returns push subscriptions for ACTIVE users
// whose last activity falls in the warning window (between
// DormancyWarningDay and DormancyThresholdDays days ago) and who have not
// received today's warning yet. The user_settings.notification_prefs.dormancy_warning
// flag must also be enabled (default true per migration 005).
func (r *UserRepo) ListDormancyWarningCandidates(ctx context.Context, now time.Time) ([]DormancyWarningCandidate, error) {
	warnAt := now.Add(-time.Duration(game.DormancyWarningDay) * 24 * time.Hour)
	dormantAt := now.Add(-time.Duration(game.DormancyThresholdDays) * 24 * time.Hour)
	today := now.Format("2006-01-02")
	rows, err := r.Pool.Query(ctx,
		`SELECT u.id, ps.endpoint, ps.p256dh, ps.auth
		   FROM users u
		   JOIN push_subscriptions ps ON ps.user_id = u.id
		   JOIN user_settings us      ON us.user_id = u.id
		  WHERE u.account_status = 'ACTIVE'
		    AND u.last_active_at <  $1
		    AND u.last_active_at >= $2
		    AND (u.dormancy_warning_sent_date IS NULL OR u.dormancy_warning_sent_date <> $3::date)
		    AND COALESCE((us.notification_prefs->>'dormancy_warning')::boolean, true)
		    AND COALESCE((us.notification_prefs->>'push')::boolean, true)`,
		warnAt, dormantAt, today)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DormancyWarningCandidate
	for rows.Next() {
		var c DormancyWarningCandidate
		if err := rows.Scan(&c.UserID, &c.Endpoint, &c.P256dh, &c.Auth); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// MarkDormancyWarningSent stamps the user's dormancy_warning_sent_date to
// today so the worker does not re-send the warning later the same day.
func (r *UserRepo) MarkDormancyWarningSent(ctx context.Context, id uuid.UUID, now time.Time) error {
	_, err := r.Pool.Exec(ctx,
		`UPDATE users SET dormancy_warning_sent_date = $1::date WHERE id = $2`,
		now.Format("2006-01-02"), id)
	return err
}

// ProcessReturn atomically converts a DORMANT account back to ACTIVE and
// grants the return bonus package (FR-DORM-03/04/05):
//   - +14×daily-cap points (bypasses the daily cap — one-time grant).
//   - 7-day EXP 1.5× buff (return_buff_until).
//   - 3 free defense tickets on the user's FIRST return only.
//   - needs_reonboarding=true so the UI re-runs the tendency survey (FR-DORM-02).
//
// Returns the ReturnGrant payload to relay to the client. The function is a
// no-op (returns nil) when the account is not DORMANT.
func (r *UserRepo) ProcessReturn(ctx context.Context, id uuid.UUID, now time.Time) (*models.ReturnGrant, error) {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var status string
	var returned int
	if err := tx.QueryRow(ctx,
		`SELECT account_status, dormant_returned_count FROM users WHERE id=$1 FOR UPDATE`, id,
	).Scan(&status, &returned); err != nil {
		return nil, err
	}
	if status != "DORMANT" {
		// Already active — nothing to grant.
		return nil, tx.Commit(ctx)
	}

	firstTime := returned == 0
	defenseGrant := 0
	if firstTime {
		defenseGrant = game.ReturnDefenseTicketsFirstTime
	}
	buffUntil := now.Add(time.Duration(game.ReturnBuffDays) * 24 * time.Hour)

	if _, err := tx.Exec(ctx,
		`UPDATE users
		    SET account_status         = 'ACTIVE',
		        dormant_since          = NULL,
		        dormant_returned_count = dormant_returned_count + 1,
		        return_buff_until      = $1,
		        needs_reonboarding     = true,
		        current_points         = current_points + $2,
		        defense_tickets        = defense_tickets + $3,
		        last_active_at         = $4,
		        updated_at             = now()
		  WHERE id = $5`,
		buffUntil, game.ReturnPointsBonus, defenseGrant, now, id); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &models.ReturnGrant{
		PointsGranted:         game.ReturnPointsBonus,
		DefenseTicketsGranted: defenseGrant,
		BuffDays:              game.ReturnBuffDays,
		FirstTime:             firstTime,
		NeedsReonboarding:     true,
	}, nil
}

// ClearReonboarding flips needs_reonboarding back to false once the user has
// re-submitted the tendency survey on return.
func (r *UserRepo) ClearReonboarding(ctx context.Context, id uuid.UUID) error {
	_, err := r.Pool.Exec(ctx,
		`UPDATE users SET needs_reonboarding = false WHERE id = $1`, id)
	return err
}
