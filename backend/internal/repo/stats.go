package repo

import (
	"context"
	"time"

	"github.com/expcalendar/backend/internal/game"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// StatsRepo holds aggregate queries used for title evaluation (SRS v1.3 Appendix C)
// and the stats/rating summary (FR-STAT-03/05).
type StatsRepo struct{ Pool *pgxpool.Pool }

func NewStatsRepo(p *pgxpool.Pool) *StatsRepo { return &StatsRepo{Pool: p} }

// kstTZ is the SQL timezone used for day-bucketing.
const kstTZ = "Asia/Seoul"

// Progress computes the title-condition counters for a user (all stat-based titles).
func (r *StatsRepo) Progress(ctx context.Context, userID uuid.UUID, currentStreak int) (game.TitleProgress, error) {
	var p game.TitleProgress
	p.Streak = currentStreak
	err := r.Pool.QueryRow(ctx,
		`SELECT
		   COUNT(*) FILTER (WHERE status='COMPLETED'),
		   COUNT(*) FILTER (WHERE status='COMPLETED' AND EXTRACT(HOUR FROM completed_at AT TIME ZONE $2) < 6),
		   COUNT(*) FILTER (WHERE status='COMPLETED' AND difficulty='HIGH')
		 FROM schedules WHERE user_id=$1`,
		userID, kstTZ).Scan(&p.CompleteCount, &p.MorningCount, &p.HighCount)
	if err != nil {
		return p, err
	}
	// overdue_count is a cumulative counter on users (incremented by the sweeper).
	if err := r.Pool.QueryRow(ctx,
		`SELECT overdue_count FROM users WHERE id=$1`, userID).Scan(&p.OverdueCount); err != nil {
		return p, err
	}
	if err := r.Pool.QueryRow(ctx,
		`SELECT COUNT(DISTINCT uc.character_id)
		 FROM user_characters uc JOIN characters c ON c.id=uc.character_id
		 WHERE uc.user_id=$1 AND c.rarity='LEGENDARY'`,
		userID).Scan(&p.LegendaryChars); err != nil {
		return p, err
	}
	return p, nil
}

// Summary returns completed/failed counts, rating grade, current & longest streak.
func (r *StatsRepo) Summary(ctx context.Context, userID uuid.UUID, currentStreak int) (completed, failed int, rating string, longest int, err error) {
	if err = r.Pool.QueryRow(ctx,
		`SELECT
		   COUNT(*) FILTER (WHERE status='COMPLETED'),
		   COUNT(*) FILTER (WHERE status='OVERDUE')
		 FROM schedules WHERE user_id=$1`, userID).Scan(&completed, &failed); err != nil {
		return
	}
	rating = game.RatingGrade(completed, failed)
	longest, err = r.LongestStreak(ctx, userID)
	return
}

// LongestStreak returns the longest run of consecutive KST days with >=1 completion.
func (r *StatsRepo) LongestStreak(ctx context.Context, userID uuid.UUID) (int, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT DISTINCT (completed_at AT TIME ZONE $2)::date AS d
		 FROM schedules WHERE user_id=$1 AND status='COMPLETED' AND completed_at IS NOT NULL
		 ORDER BY d`, userID, kstTZ)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	var days []time.Time
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			return 0, err
		}
		days = append(days, d)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	best, run := 0, 0
	var prev time.Time
	for i, d := range days {
		if i > 0 && d.Sub(prev) == 24*time.Hour {
			run++
		} else {
			run = 1
		}
		if run > best {
			best = run
		}
		prev = d
	}
	return best, nil
}
