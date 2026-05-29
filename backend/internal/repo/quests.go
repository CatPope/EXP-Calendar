package repo

import (
	"context"
	"time"

	"github.com/expcalendar/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type QuestRepo struct{ Pool *pgxpool.Pool }

func NewQuestRepo(p *pgxpool.Pool) *QuestRepo { return &QuestRepo{Pool: p} }

const dailyReward = 50

var DailyQuestTypes = []string{"ADD_PLAN", "COMPLETE_PLAN", "VISIT_SHOWCASE"}

// EnsureToday ensures that all three daily quest rows exist for today, then returns them.
func (r *QuestRepo) EnsureToday(ctx context.Context, userID uuid.UUID, today time.Time) ([]*models.Quest, error) {
	dateStr := today.Format("2006-01-02")
	for _, qt := range DailyQuestTypes {
		if _, err := r.Pool.Exec(ctx,
			`INSERT INTO quest_log(user_id, quest_date, quest_type, reward_points)
			 VALUES($1,$2,$3,$4) ON CONFLICT (user_id, quest_date, quest_type) DO NOTHING`,
			userID, dateStr, qt, dailyReward); err != nil {
			return nil, err
		}
	}
	rows, err := r.Pool.Query(ctx,
		`SELECT quest_type, completed, reward_points FROM quest_log
		 WHERE user_id=$1 AND quest_date=$2 ORDER BY quest_type`,
		userID, dateStr)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.Quest
	for rows.Next() {
		q := &models.Quest{}
		if err := rows.Scan(&q.QuestType, &q.Completed, &q.RewardPoints); err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

// MarkCompletedTx flips the quest row to completed (idempotent) and returns whether this call changed it.
func (r *QuestRepo) MarkCompletedTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, day time.Time, questType string) (bool, int, error) {
	dateStr := day.Format("2006-01-02")
	// ensure row exists
	if _, err := tx.Exec(ctx,
		`INSERT INTO quest_log(user_id, quest_date, quest_type, reward_points)
		 VALUES($1,$2,$3,$4) ON CONFLICT (user_id, quest_date, quest_type) DO NOTHING`,
		userID, dateStr, questType, dailyReward); err != nil {
		return false, 0, err
	}
	var rewardPoints int
	row := tx.QueryRow(ctx,
		`UPDATE quest_log SET completed=true, completed_at=now()
		 WHERE user_id=$1 AND quest_date=$2 AND quest_type=$3 AND completed=false
		 RETURNING reward_points`,
		userID, dateStr, questType)
	if err := row.Scan(&rewardPoints); err != nil {
		if err == pgx.ErrNoRows {
			return false, 0, nil
		}
		return false, 0, err
	}
	return true, rewardPoints, nil
}

// MarkCompleted is the non-tx wrapper.
func (r *QuestRepo) MarkCompleted(ctx context.Context, userID uuid.UUID, day time.Time, questType string) (bool, int, error) {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return false, 0, err
	}
	defer tx.Rollback(ctx)
	ok, rp, err := r.MarkCompletedTx(ctx, tx, userID, day, questType)
	if err != nil {
		return false, 0, err
	}
	if err := tx.Commit(ctx); err != nil {
		return false, 0, err
	}
	return ok, rp, nil
}
