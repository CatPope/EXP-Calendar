package repo

import (
	"context"
	"time"

	"github.com/expcalendar/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ScheduleRepo struct{ Pool *pgxpool.Pool }

func NewScheduleRepo(p *pgxpool.Pool) *ScheduleRepo { return &ScheduleRepo{Pool: p} }

const scheduleSelect = `SELECT id, user_id, title, description, difficulty, status,
	due_date, google_event_id, completed_at, created_at FROM schedules`

func scanSchedule(row pgx.Row) (*models.Schedule, error) {
	var s models.Schedule
	if err := row.Scan(&s.ID, &s.UserID, &s.Title, &s.Description, &s.Difficulty, &s.Status,
		&s.DueDate, &s.GoogleEventID, &s.CompletedAt, &s.CreatedAt); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ScheduleRepo) Create(ctx context.Context, userID uuid.UUID, title, description, difficulty string, due time.Time) (*models.Schedule, error) {
	row := r.Pool.QueryRow(ctx,
		`INSERT INTO schedules(user_id, title, description, difficulty, due_date)
		 VALUES($1,$2,$3,$4,$5) RETURNING id`,
		userID, title, description, difficulty, due)
	var id uuid.UUID
	if err := row.Scan(&id); err != nil {
		return nil, err
	}
	return r.GetByID(ctx, userID, id)
}

func (r *ScheduleRepo) GetByID(ctx context.Context, userID, id uuid.UUID) (*models.Schedule, error) {
	row := r.Pool.QueryRow(ctx, scheduleSelect+` WHERE id=$1 AND user_id=$2`, id, userID)
	return scanSchedule(row)
}

func (r *ScheduleRepo) ListInRange(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]*models.Schedule, error) {
	rows, err := r.Pool.Query(ctx, scheduleSelect+` WHERE user_id=$1 AND due_date >= $2 AND due_date < $3 ORDER BY due_date ASC`,
		userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.Schedule
	for rows.Next() {
		s, err := scanSchedule(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *ScheduleRepo) Update(ctx context.Context, userID, id uuid.UUID, patch map[string]any) (*models.Schedule, error) {
	if len(patch) == 0 {
		return r.GetByID(ctx, userID, id)
	}
	// Build dynamic UPDATE with whitelist.
	cols := map[string]bool{
		"title": true, "description": true, "difficulty": true,
		"status": true, "due_date": true,
	}
	setParts := ""
	args := []any{}
	i := 1
	for k, v := range patch {
		if !cols[k] {
			continue
		}
		if i > 1 {
			setParts += ", "
		}
		setParts += k + " = $" + itoa(i)
		args = append(args, v)
		i++
	}
	if setParts == "" {
		return r.GetByID(ctx, userID, id)
	}
	args = append(args, id, userID)
	sql := "UPDATE schedules SET " + setParts + ", updated_at=now() WHERE id=$" + itoa(i) + " AND user_id=$" + itoa(i+1)
	if _, err := r.Pool.Exec(ctx, sql, args...); err != nil {
		return nil, err
	}
	return r.GetByID(ctx, userID, id)
}

func (r *ScheduleRepo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	_, err := r.Pool.Exec(ctx, `DELETE FROM schedules WHERE id=$1 AND user_id=$2`, id, userID)
	return err
}

// CountAddedOn returns schedules created on the given date for the user.
func (r *ScheduleRepo) CountAddedOn(ctx context.Context, userID uuid.UUID, day time.Time) (int, error) {
	row := r.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM schedules WHERE user_id=$1 AND created_at::date=$2`,
		userID, day.Format("2006-01-02"))
	var n int
	if err := row.Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}

// CountCompletedOn returns schedules completed on the given date for the user.
func (r *ScheduleRepo) CountCompletedOn(ctx context.Context, userID uuid.UUID, day time.Time) (int, error) {
	row := r.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM schedules WHERE user_id=$1 AND status='COMPLETED' AND completed_at::date=$2`,
		userID, day.Format("2006-01-02"))
	var n int
	if err := row.Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}

// MarkCompletedTx atomically transitions PENDING→COMPLETED. Returns (alreadyCompleted=true) if no-op.
func (r *ScheduleRepo) MarkCompletedTx(ctx context.Context, tx pgx.Tx, userID, id uuid.UUID, now time.Time) (bool, error) {
	tag, err := tx.Exec(ctx,
		`UPDATE schedules SET status='COMPLETED', completed_at=$1, updated_at=now()
		 WHERE id=$2 AND user_id=$3 AND status='PENDING'`,
		now, id, userID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 0, nil
}

// MarkUncompletedTx atomically transitions COMPLETED→PENDING (clearing completed_at).
// Returns (wasNotCompleted=true) if the row wasn't COMPLETED (no-op).
func (r *ScheduleRepo) MarkUncompletedTx(ctx context.Context, tx pgx.Tx, userID, id uuid.UUID) (bool, error) {
	tag, err := tx.Exec(ctx,
		`UPDATE schedules SET status='PENDING', completed_at=NULL, updated_at=now()
		 WHERE id=$1 AND user_id=$2 AND status='COMPLETED'`,
		id, userID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 0, nil
}

func itoa(i int) string {
	// minimal int→string for small positive numbers
	if i == 0 {
		return "0"
	}
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	buf := [20]byte{}
	pos := len(buf)
	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		buf[pos] = '-'
	}
	return string(buf[pos:])
}
