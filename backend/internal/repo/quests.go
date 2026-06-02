package repo

import (
	"context"
	"time"

	"github.com/expcalendar/backend/internal/game"
	"github.com/expcalendar/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type QuestRepo struct{ Pool *pgxpool.Pool }

func NewQuestRepo(p *pgxpool.Pool) *QuestRepo { return &QuestRepo{Pool: p} }

var DailyQuestTypes = []string{"ADD_PLAN", "COMPLETE_PLAN", "VISIT_SHOWCASE"}

// EnsureToday ensures that all three daily quest rows exist for today, then returns them.
// reward_points carries the per-type differential reward (FR-GAME-04).
func (r *QuestRepo) EnsureToday(ctx context.Context, userID uuid.UUID, today time.Time) ([]*models.Quest, error) {
	dateStr := today.Format("2006-01-02")
	for _, qt := range DailyQuestTypes {
		rp := game.QuestRewardPoints(qt)
		if _, err := r.Pool.Exec(ctx,
			`INSERT INTO quest_log(user_id, quest_date, quest_type, reward_points)
			 VALUES($1,$2,$3,$4) ON CONFLICT (user_id, quest_date, quest_type) DO NOTHING`,
			userID, dateStr, qt, rp); err != nil {
			return nil, err
		}
		// keep not-yet-completed rows in sync with the current differential value
		if _, err := r.Pool.Exec(ctx,
			`UPDATE quest_log SET reward_points=$4
			 WHERE user_id=$1 AND quest_date=$2 AND quest_type=$3 AND completed=false`,
			userID, dateStr, qt, rp); err != nil {
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
		userID, dateStr, questType, game.QuestRewardPoints(questType)); err != nil {
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

// AllCompletedTx reports whether all three daily quests are completed for the day.
func (r *QuestRepo) AllCompletedTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, day time.Time) (bool, error) {
	var n int
	err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM quest_log WHERE user_id=$1 AND quest_date=$2 AND completed=true`,
		userID, day.Format("2006-01-02")).Scan(&n)
	return n >= len(DailyQuestTypes), err
}

// AllQuestsStreak returns the number of consecutive days ending at `today` where
// all three daily quests were completed (FR-GAME-06 streak bonus).
func (r *QuestRepo) AllQuestsStreak(ctx context.Context, userID uuid.UUID, today time.Time) (int, error) {
	from := today.AddDate(0, 0, -120)
	rows, err := r.Pool.Query(ctx,
		`SELECT quest_date FROM quest_log
		 WHERE user_id=$1 AND completed=true AND quest_date BETWEEN $2 AND $3
		 GROUP BY quest_date HAVING COUNT(*) >= $4`,
		userID, from.Format("2006-01-02"), today.Format("2006-01-02"), len(DailyQuestTypes))
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	done := map[string]bool{}
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			return 0, err
		}
		done[d.Format("2006-01-02")] = true
	}
	streak := 0
	for i := 0; i < 121; i++ {
		if done[today.AddDate(0, 0, -i).Format("2006-01-02")] {
			streak++
		} else {
			break
		}
	}
	return streak, nil
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
