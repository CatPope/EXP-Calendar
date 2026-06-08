package repo

import (
	"context"
	"math"
	"time"

	"github.com/expcalendar/backend/internal/game"
	"github.com/expcalendar/backend/internal/models"
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
// completed = schedule completions + quest claims (reward_log source='QUEST').
// failed    = OVERDUE schedules (quest failures don't exist).
func (r *StatsRepo) Summary(ctx context.Context, userID uuid.UUID, currentStreak int) (completed, failed int, rating string, longest int, err error) {
	var schedCompleted, schedFailed int
	if err = r.Pool.QueryRow(ctx,
		`SELECT
		   COUNT(*) FILTER (WHERE status='COMPLETED'),
		   COUNT(*) FILTER (WHERE status='OVERDUE')
		 FROM schedules WHERE user_id=$1`, userID).Scan(&schedCompleted, &schedFailed); err != nil {
		return
	}
	var questCount int
	if err = r.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM reward_log WHERE user_id=$1 AND source='QUEST'`,
		userID).Scan(&questCount); err != nil {
		return
	}
	completed = schedCompleted + questCount
	failed = schedFailed
	rating = game.RatingGrade(completed, failed)
	longest, err = r.LongestStreak(ctx, userID)
	return
}

// RatingPercentile returns the caller's top-percentile rank among all users who have
// at least one completed-or-failed schedule. Percentile = round(100 * count_of_users
// with strictly_higher_success_rate / max(1, total_active_users)). Lower = better
// (0 means the user has the highest or tied-highest rate).
//
// callerRate is the caller's own success rate (0..1), computed by the caller before
// this is invoked so it can be passed directly as a SQL parameter ($1).
//
// The SQL aggregates schedules per user (COMPLETED vs OVERDUE counts), excludes
// users with zero activity, and counts how many users have a rate strictly above $1:
//
//	WITH user_rates AS (
//	  SELECT user_id,
//	         COUNT(*) FILTER (WHERE status='COMPLETED') AS c,
//	         COUNT(*) FILTER (WHERE status='OVERDUE')   AS f
//	  FROM schedules
//	  GROUP BY user_id
//	  HAVING (COUNT(*) FILTER (WHERE status='COMPLETED') +
//	          COUNT(*) FILTER (WHERE status='OVERDUE')) > 0
//	)
//	SELECT
//	  COUNT(*) FILTER (WHERE CASE WHEN c+f=0 THEN 0 ELSE c/(c+f) END > $1),
//	  COUNT(*)
//	FROM user_rates
func (r *StatsRepo) RatingPercentile(ctx context.Context, callerRate float64) (int, error) {
	var above, total int
	err := r.Pool.QueryRow(ctx, `
		WITH user_rates AS (
		  SELECT user_id,
		         COUNT(*) FILTER (WHERE status='COMPLETED')::float8 AS c,
		         COUNT(*) FILTER (WHERE status='OVERDUE')::float8   AS f
		  FROM schedules
		  GROUP BY user_id
		  HAVING (COUNT(*) FILTER (WHERE status='COMPLETED') +
		          COUNT(*) FILTER (WHERE status='OVERDUE')) > 0
		)
		SELECT
		  COUNT(*) FILTER (WHERE CASE WHEN c+f=0 THEN 0 ELSE c/(c+f) END > $1),
		  COUNT(*)
		FROM user_rates
	`, callerRate).Scan(&above, &total)
	if err != nil {
		return 0, err
	}
	if total <= 0 {
		return 0, nil
	}
	pct := int(math.Round(float64(above) / float64(total) * 100))
	return pct, nil
}

// SummaryFull returns a fully-populated StatsSummary including percentile and next-grade
// progress (v1.4 fields). It reuses Summary for core counts then adds two extra queries.
func (r *StatsRepo) SummaryFull(ctx context.Context, userID uuid.UUID, currentStreak int) (models.StatsSummary, error) {
	completed, failed, rating, longest, err := r.Summary(ctx, userID, currentStreak)
	if err != nil {
		return models.StatsSummary{}, err
	}

	successRate := 0.0
	if completed+failed > 0 {
		successRate = float64(completed) / float64(completed+failed)
	}

	percentile, err := r.RatingPercentile(ctx, successRate)
	if err != nil {
		return models.StatsSummary{}, err
	}

	nextGrade, nextGradePct := game.NextGradeProgress(successRate)

	return models.StatsSummary{
		TotalCompleted: completed,
		TotalFailed:    failed,
		SuccessRate:    successRate,
		RatingGrade:    rating,
		CurrentStreak:  currentStreak,
		LongestStreak:  longest,
		Percentile:     percentile,
		NextGrade:      nextGrade,
		NextGradePct:   nextGradePct,
	}, nil
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
