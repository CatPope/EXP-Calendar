package repo

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RewardRepo struct{ Pool *pgxpool.Pool }

func NewRewardRepo(p *pgxpool.Pool) *RewardRepo { return &RewardRepo{Pool: p} }

// LogTx inserts a reward_log row inside an existing transaction.
func (r *RewardRepo) LogTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, scheduleID *uuid.UUID, source string, exp, points int) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO reward_log(user_id, schedule_id, source, exp_gained, points_gained)
		 VALUES($1,$2,$3,$4,$5)`,
		userID, scheduleID, source, exp, points)
	return err
}

// ScheduleRewardTx sums the exp/points logged for a given schedule (for reversal
// on uncomplete). Returns (0,0) when no rows exist.
func (r *RewardRepo) ScheduleRewardTx(ctx context.Context, tx pgx.Tx, userID, scheduleID uuid.UUID) (exp, points int, err error) {
	err = tx.QueryRow(ctx,
		`SELECT COALESCE(SUM(exp_gained),0), COALESCE(SUM(points_gained),0)
		 FROM reward_log WHERE user_id=$1 AND schedule_id=$2`,
		userID, scheduleID).Scan(&exp, &points)
	return
}

// DeleteScheduleTx removes all reward_log rows for a schedule (uncomplete).
func (r *RewardRepo) DeleteScheduleTx(ctx context.Context, tx pgx.Tx, userID, scheduleID uuid.UUID) error {
	_, err := tx.Exec(ctx, `DELETE FROM reward_log WHERE user_id=$1 AND schedule_id=$2`, userID, scheduleID)
	return err
}

// GrassByDay returns dates within [from, to] mapped to schedule-completion counts.
func (r *RewardRepo) GrassByDay(ctx context.Context, userID uuid.UUID, from, to time.Time) (map[string]int, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT completed_at::date AS d, COUNT(*) FROM schedules
		 WHERE user_id=$1 AND status='COMPLETED' AND completed_at >= $2 AND completed_at < $3
		 GROUP BY d ORDER BY d`,
		userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var d time.Time
		var n int
		if err := rows.Scan(&d, &n); err != nil {
			return nil, err
		}
		out[d.Format("2006-01-02")] = n
	}
	return out, rows.Err()
}

// SeriesByDay returns rows {date, success, fail} where success=completed count, fail=overdue count.
func (r *RewardRepo) SeriesByDay(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]map[string]any, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT d::date,
		   SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END) AS success,
		   SUM(CASE WHEN status='OVERDUE'   THEN 1 ELSE 0 END) AS fail
		 FROM (
		   SELECT GREATEST(due_date, completed_at) AS d, status
		   FROM schedules
		   WHERE user_id=$1 AND due_date >= $2 AND due_date < $3
		 ) s
		 GROUP BY d::date ORDER BY d::date`,
		userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var d time.Time
		var s, f int
		if err := rows.Scan(&d, &s, &f); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"date":    d.Format("2006-01-02"),
			"success": s,
			"fail":    f,
		})
	}
	return out, rows.Err()
}

// ConsecutiveCompletionDays returns N where the user completed >=1 schedule on each of the last N days ending today (inclusive).
func (r *RewardRepo) ConsecutiveCompletionDays(ctx context.Context, userID uuid.UUID, today time.Time, lookbackDays int) (int, error) {
	if lookbackDays <= 0 {
		lookbackDays = 14
	}
	from := today.AddDate(0, 0, -lookbackDays+1)
	rows, err := r.Pool.Query(ctx,
		`SELECT DISTINCT completed_at::date FROM schedules
		 WHERE user_id=$1 AND status='COMPLETED' AND completed_at::date BETWEEN $2 AND $3`,
		userID, from.Format("2006-01-02"), today.Format("2006-01-02"))
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	days := map[string]bool{}
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			return 0, err
		}
		days[d.Format("2006-01-02")] = true
	}
	streak := 0
	for i := 0; i < lookbackDays; i++ {
		d := today.AddDate(0, 0, -i).Format("2006-01-02")
		if days[d] {
			streak++
		} else {
			break
		}
	}
	return streak, nil
}

func (r *RewardRepo) Pool0() *pgxpool.Pool { return r.Pool }
