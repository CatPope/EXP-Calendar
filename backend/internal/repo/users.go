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

// truncateRunes returns s clipped to at most max Unicode runes (not bytes).
func truncateRunes(s string, max int) string {
	if max <= 0 {
		return ""
	}
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max])
}

type UserRepo struct{ Pool *pgxpool.Pool }

func NewUserRepo(p *pgxpool.Pool) *UserRepo { return &UserRepo{Pool: p} }

const userSelect = `SELECT id, email, display_name, google_sub, account_status, level,
	total_exp, current_points, daily_points_earned, daily_points_earned_date,
	tendency, persona_character_type, persona_definition, persona_tokens,
	persona_showcase_text, persona_llm_output, character_skin, active_cosmetic,
	summon_tickets, pity_counter,
	persona_name, persona_tone, persona_history, persona_thoughts, status_message, defense_tickets,
	stats_public, password_hash,
	created_at, updated_at FROM users`

func scanUser(row pgx.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &u.GoogleSub, &u.AccountStatus, &u.Level,
		&u.TotalExp, &u.CurrentPoints, &u.DailyPointsEarned, &u.DailyPointsEarnedDate,
		&u.Tendency, &u.PersonaCharacterType, &u.PersonaDefinition, &u.PersonaTokens,
		&u.PersonaShowcaseText, &u.PersonaLLMOutput, &u.CharacterSkin, &u.ActiveCosmetic,
		&u.SummonTickets, &u.PityCounter,
		&u.PersonaName, &u.PersonaTone, &u.PersonaHistory, &u.PersonaThoughts, &u.StatusMessage, &u.DefenseTickets,
		&u.StatsPublic, &u.PasswordHash,
		&u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// SetStatsPublic 은 쇼케이스 통계 공개 여부 토글을 저장한다.
func (r *UserRepo) SetStatsPublic(ctx context.Context, id uuid.UUID, public bool) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET stats_public=$1, updated_at=now() WHERE id=$2`, public, id)
	return err
}

// SetPasswordHash 는 사용자 비밀번호 hash 를 저장한다. 빈 문자열이면 hash 해제(legacy).
func (r *UserRepo) SetPasswordHash(ctx context.Context, id uuid.UUID, hash string) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2`, hash, id)
	return err
}

// SetCharacterSkin persists the user's chosen 2D character skin id.
func (r *UserRepo) SetCharacterSkin(ctx context.Context, id uuid.UUID, skin string) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET character_skin=$1, updated_at=now() WHERE id=$2`, skin, id)
	return err
}

// SetActiveCosmetic persists the user's equipped cosmetic effect (e.g. "cosmetic:aura").
// Empty string clears (un-equips).
func (r *UserRepo) SetActiveCosmetic(ctx context.Context, id uuid.UUID, cosmetic string) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET active_cosmetic=$1, updated_at=now() WHERE id=$2`, cosmetic, id)
	return err
}

// PurchasedCosmetics returns the distinct cosmetic effect ids the user owns
// (purchased items whose effect starts with "cosmetic:").
func (r *UserRepo) PurchasedCosmetics(ctx context.Context, id uuid.UUID) ([]string, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT DISTINCT i.effect
		   FROM purchases p JOIN items i ON i.id = p.item_id
		  WHERE p.user_id=$1 AND i.effect LIKE 'cosmetic:%'
		  ORDER BY i.effect`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var e string
		if err := rows.Scan(&e); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	row := r.Pool.QueryRow(ctx, userSelect+` WHERE id=$1`, id)
	return scanUser(row)
}

// GetByIDTx is GetByID inside a caller-owned transaction. Returned record
// includes the full column set defined by userSelect (kept in sync with
// scanUser); this is the only difference from the legacy mini-reader that
// previously lived inside handlers/schedules.go.
func (r *UserRepo) GetByIDTx(ctx context.Context, tx pgx.Tx, id uuid.UUID) (*models.User, error) {
	row := tx.QueryRow(ctx, userSelect+` WHERE id=$1`, id)
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

// SetDisplayName updates the user's display name.
func (r *UserRepo) SetDisplayName(ctx context.Context, id uuid.UUID, name string) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET display_name=$1, updated_at=now() WHERE id=$2`, name, id)
	return err
}

func (r *UserRepo) SetPersonaCharacterType(ctx context.Context, id uuid.UUID, characterType string) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET persona_character_type=$1, updated_at=now() WHERE id=$2`, characterType, id)
	return err
}

func (r *UserRepo) SetPersonaShowcase(ctx context.Context, id uuid.UUID, showcaseText, llmOutput string) error {
	// "나의 한마디" 통일: 통계 화면의 status_message 와 페르소나 화면의 persona_llm_output 은
	// 같은 의미이므로 게시 시 같이 갱신한다. status_message 는 최대 200자(rune) 제한.
	status := truncateRunes(llmOutput, 200)
	_, err := r.Pool.Exec(ctx, `UPDATE users SET persona_showcase_text=$1, persona_llm_output=$2, status_message=$3, updated_at=now() WHERE id=$4`,
		showcaseText, llmOutput, status, id)
	return err
}

// UpdatePersonaFields performs a partial update of the structured persona fields.
// Only non-nil pointer arguments are written. persona_definition is kept coherent
// by composing it from the resulting tone/history/thoughts values.
func (r *UserRepo) UpdatePersonaFields(ctx context.Context, id uuid.UUID, name, tone, history, thoughts *string) error {
	// Build dynamic SET clause — only include columns the caller passed.
	sets := []string{}
	args := []any{}
	argIdx := 1

	if name != nil {
		sets = append(sets, "persona_name=$"+itoa(argIdx))
		args = append(args, *name)
		argIdx++
	}
	if tone != nil {
		sets = append(sets, "persona_tone=$"+itoa(argIdx))
		args = append(args, *tone)
		argIdx++
	}
	if history != nil {
		sets = append(sets, "persona_history=$"+itoa(argIdx))
		args = append(args, *history)
		argIdx++
	}
	if thoughts != nil {
		sets = append(sets, "persona_thoughts=$"+itoa(argIdx))
		args = append(args, *thoughts)
		argIdx++
	}

	if len(sets) == 0 {
		return nil // nothing to update
	}

	// Also keep persona_definition in sync so existing LLM/showcase code has content.
	// We do this via a sub-select to compose from the resulting stored values.
	sets = append(sets,
		"persona_definition = trim(both from concat_ws(E'\\n', persona_name, persona_tone, persona_history, persona_thoughts))")
	sets = append(sets, "updated_at=now()")

	query := "UPDATE users SET "
	for i, s := range sets {
		if i > 0 {
			query += ", "
		}
		query += s
	}
	query += " WHERE id=$" + itoa(argIdx)
	args = append(args, id)

	_, err := r.Pool.Exec(ctx, query, args...)
	return err
}

// SetStatusMessage overwrites the user's status_message (may be empty string).
func (r *UserRepo) SetStatusMessage(ctx context.Context, id uuid.UUID, msg string) error {
	_, err := r.Pool.Exec(ctx, `UPDATE users SET status_message=$1, updated_at=now() WHERE id=$2`, msg, id)
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

// SearchShowcaseUsers returns up to N other ACTIVE users whose display_name
// matches the query (case-insensitive substring), ordered by level (FR-SOC-04).
func (r *UserRepo) SearchShowcaseUsers(ctx context.Context, excludeID uuid.UUID, query string, limit int) ([]*models.User, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := r.Pool.Query(ctx, userSelect+` WHERE id <> $1 AND account_status='ACTIVE'
		AND display_name ILIKE '%' || $2 || '%'
		ORDER BY level DESC, total_exp DESC LIMIT $3`, excludeID, query, limit)
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
