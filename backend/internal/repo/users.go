package repo

import (
	"context"
	"errors"
	"time"

	"github.com/expcalendar/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct{ Pool *pgxpool.Pool }

func NewUserRepo(p *pgxpool.Pool) *UserRepo { return &UserRepo{Pool: p} }

const userSelect = `SELECT id, email, display_name, google_sub, account_status, level,
	total_exp, current_points, daily_points_earned, daily_points_earned_date,
	tendency, persona_character_type, persona_definition, persona_tokens,
	persona_showcase_text, persona_llm_output,
	created_at, updated_at FROM users`

func scanUser(row pgx.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &u.GoogleSub, &u.AccountStatus, &u.Level,
		&u.TotalExp, &u.CurrentPoints, &u.DailyPointsEarned, &u.DailyPointsEarnedDate,
		&u.Tendency, &u.PersonaCharacterType, &u.PersonaDefinition, &u.PersonaTokens,
		&u.PersonaShowcaseText, &u.PersonaLLMOutput,
		&u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	row := r.Pool.QueryRow(ctx, userSelect+` WHERE id=$1`, id)
	return scanUser(row)
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	row := r.Pool.QueryRow(ctx, userSelect+` WHERE email=$1`, email)
	return scanUser(row)
}

// UpsertByEmail returns existing user or creates a new one (display_name updated if empty).
func (r *UserRepo) UpsertByEmail(ctx context.Context, email, displayName string, googleSub *string) (*models.User, error) {
	existing, err := r.GetByEmail(ctx, email)
	if err == nil {
		if existing.DisplayName == "" && displayName != "" {
			_, _ = r.Pool.Exec(ctx, `UPDATE users SET display_name=$1, updated_at=now() WHERE id=$2`, displayName, existing.ID)
			existing.DisplayName = displayName
		}
		if googleSub != nil && (existing.GoogleSub == nil || *existing.GoogleSub == "") {
			_, _ = r.Pool.Exec(ctx, `UPDATE users SET google_sub=$1, updated_at=now() WHERE id=$2`, *googleSub, existing.ID)
			existing.GoogleSub = googleSub
		}
		return existing, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	row := r.Pool.QueryRow(ctx, `INSERT INTO users(email, display_name, google_sub) VALUES($1,$2,$3) RETURNING id`, email, displayName, googleSub)
	var id uuid.UUID
	if err := row.Scan(&id); err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *UserRepo) SetTendency(ctx context.Context, id uuid.UUID, tendency string) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET tendency=$1, updated_at=now() WHERE id=$2`, tendency, id)
	return err
}

func (r *UserRepo) SetPersonaCharacterType(ctx context.Context, id uuid.UUID, characterType string) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET persona_character_type=$1, updated_at=now() WHERE id=$2`, characterType, id)
	return err
}

func (r *UserRepo) SetPersonaShowcase(ctx context.Context, id uuid.UUID, showcaseText, llmOutput string) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET persona_showcase_text=$1, persona_llm_output=$2, updated_at=now() WHERE id=$3`,
		showcaseText, llmOutput, id)
	return err
}

// AddPersonaTokens increments persona_tokens (used by the PERSONA shop item).
func (r *UserRepo) AddPersonaTokens(ctx context.Context, tx pgx.Tx, id uuid.UUID, n int) error {
	if n == 0 {
		return nil
	}
	_, err := tx.Exec(ctx, `UPDATE users SET persona_tokens = persona_tokens + $1, updated_at=now() WHERE id=$2`, n, id)
	return err
}

// EnsureMinPersonaTokens tops up persona_tokens to at least `min` (no-op if
// already at or above). Used by dev-login so developers don't have to grind
// the shop just to exercise the persona flow.
func (r *UserRepo) EnsureMinPersonaTokens(ctx context.Context, id uuid.UUID, min int) error {
	_, err := r.Pool.Exec(ctx,
		`UPDATE users SET persona_tokens = $1, updated_at=now()
		 WHERE id=$2 AND persona_tokens < $1`,
		min, id)
	return err
}

// EnsureMinPoints tops up current_points to at least `min` (no-op if already
// at or above). Used by dev-login so developers can exercise shop/purchase
// flows without grinding schedule completions.
func (r *UserRepo) EnsureMinPoints(ctx context.Context, id uuid.UUID, min int) error {
	_, err := r.Pool.Exec(ctx,
		`UPDATE users SET current_points = $1, updated_at=now()
		 WHERE id=$2 AND current_points < $1`,
		min, id)
	return err
}

// ConsumePersonaTokenSetDefinition atomically (1) requires persona_tokens >= 1,
// (2) decrements it, (3) overwrites persona_definition. Returns the new token
// balance. Returns (-1, ErrNoTokens) if the user has none.
func (r *UserRepo) ConsumePersonaTokenSetDefinition(ctx context.Context, id uuid.UUID, definition string) (int, error) {
	var remaining int
	err := r.Pool.QueryRow(ctx,
		`UPDATE users
		   SET persona_tokens     = persona_tokens - 1,
		       persona_definition = $1,
		       updated_at         = now()
		 WHERE id = $2 AND persona_tokens >= 1
		 RETURNING persona_tokens`,
		definition, id).Scan(&remaining)
	if errors.Is(err, pgx.ErrNoRows) {
		return -1, ErrNoTokens
	}
	if err != nil {
		return -1, err
	}
	return remaining, nil
}

// ErrNoTokens is returned when a persona definition write is attempted without
// a 캐릭터 설정권 in stock.
var ErrNoTokens = errors.New("no persona tokens")

func (r *UserRepo) SpendPoints(ctx context.Context, id uuid.UUID, amount int) (int, error) {
	var remaining int
	err := r.Pool.QueryRow(ctx,
		`UPDATE users SET current_points = current_points - $1, updated_at=now()
		 WHERE id=$2 AND current_points >= $1 RETURNING current_points`,
		amount, id).Scan(&remaining)
	if err != nil {
		return 0, err
	}
	return remaining, nil
}

// SpendPointsTx is SpendPoints inside a caller-owned transaction.
func (r *UserRepo) SpendPointsTx(ctx context.Context, tx pgx.Tx, id uuid.UUID, amount int) (int, error) {
	var remaining int
	err := tx.QueryRow(ctx,
		`UPDATE users SET current_points = current_points - $1, updated_at=now()
		 WHERE id=$2 AND current_points >= $1 RETURNING current_points`,
		amount, id).Scan(&remaining)
	if err != nil {
		return 0, err
	}
	return remaining, nil
}

// AddPoints adds n points without daily-cap logic (used for quests after cap applied externally).
func (r *UserRepo) AddPoints(ctx context.Context, tx pgx.Tx, id uuid.UUID, points int) error {
	if points == 0 {
		return nil
	}
	_, err := tx.Exec(ctx, `UPDATE users SET current_points = current_points + $1, updated_at=now() WHERE id=$2`, points, id)
	return err
}

// ListShowcaseUsers returns up to N other users (excluding the caller) for showcase recommendations.
func (r *UserRepo) ListShowcaseUsers(ctx context.Context, excludeID uuid.UUID, limit int) ([]*models.User, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.Pool.Query(ctx, userSelect+` WHERE id <> $1 AND account_status='ACTIVE'
		ORDER BY level DESC, total_exp DESC LIMIT $2`, excludeID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// ResetDailyPointsIfNeeded resets daily_points_earned to 0 if last-earned date isn't today.
func (r *UserRepo) ResetDailyPointsIfNeeded(ctx context.Context, tx pgx.Tx, id uuid.UUID, today time.Time) error {
	_, err := tx.Exec(ctx, `UPDATE users SET daily_points_earned=0, daily_points_earned_date=$1, updated_at=now()
		WHERE id=$2 AND daily_points_earned_date <> $1`, today.Format("2006-01-02"), id)
	return err
}
