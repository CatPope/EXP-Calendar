package repo

import (
	"context"

	"github.com/expcalendar/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TitleRepo struct{ Pool *pgxpool.Pool }

func NewTitleRepo(p *pgxpool.Pool) *TitleRepo { return &TitleRepo{Pool: p} }

func (r *TitleRepo) GetByName(ctx context.Context, name string) (*models.Title, error) {
	row := r.Pool.QueryRow(ctx, `SELECT id, name, grade, color_hex, icon_url, description, condition FROM titles WHERE name=$1`, name)
	var t models.Title
	if err := row.Scan(&t.ID, &t.Name, &t.Grade, &t.ColorHex, &t.IconURL, &t.Description, &t.Condition); err != nil {
		return nil, err
	}
	return &t, nil
}

// GrantTitleTx inserts user_titles row, ON CONFLICT DO NOTHING. Returns true if newly granted.
func (r *TitleRepo) GrantTitleTx(ctx context.Context, tx pgx.Tx, userID, titleID uuid.UUID) (bool, error) {
	tag, err := tx.Exec(ctx,
		`INSERT INTO user_titles(user_id, title_id) VALUES($1,$2) ON CONFLICT (user_id, title_id) DO NOTHING`,
		userID, titleID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *TitleRepo) GrantTitleByName(ctx context.Context, tx pgx.Tx, userID uuid.UUID, name string) (*models.Title, bool, error) {
	t, err := r.getByNameTx(ctx, tx, name)
	if err != nil {
		return nil, false, err
	}
	granted, err := r.GrantTitleTx(ctx, tx, userID, t.ID)
	if err != nil {
		return nil, false, err
	}
	return t, granted, nil
}

func (r *TitleRepo) getByNameTx(ctx context.Context, tx pgx.Tx, name string) (*models.Title, error) {
	row := tx.QueryRow(ctx, `SELECT id, name, grade, color_hex, icon_url, description, condition FROM titles WHERE name=$1`, name)
	var t models.Title
	if err := row.Scan(&t.ID, &t.Name, &t.Grade, &t.ColorHex, &t.IconURL, &t.Description, &t.Condition); err != nil {
		return nil, err
	}
	return &t, nil
}

// TitleWithCondition pairs a master title with its raw unlock condition string.
type TitleWithCondition struct {
	Title     *models.Title
	Condition string
}

// ListAllWithCondition returns every master title plus its condition string, for
// stat-based title evaluation (SRS v1.3 Appendix C).
func (r *TitleRepo) ListAllWithCondition(ctx context.Context) ([]TitleWithCondition, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT id, name, grade, color_hex, icon_url, description, condition FROM titles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TitleWithCondition
	for rows.Next() {
		t := &models.Title{}
		if err := rows.Scan(&t.ID, &t.Name, &t.Grade, &t.ColorHex, &t.IconURL, &t.Description, &t.Condition); err != nil {
			return nil, err
		}
		out = append(out, TitleWithCondition{Title: t, Condition: t.Condition})
	}
	return out, rows.Err()
}

// AttachNegativeModifierTx sets a penalty modifier on the user's equipped title
// only if one is not already present. Returns true if it newly attached.
func (r *TitleRepo) AttachNegativeModifierTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, modifier string) (bool, error) {
	tag, err := tx.Exec(ctx,
		`UPDATE user_titles SET negative_modifier=$1
		 WHERE user_id=$2 AND is_equipped=true AND negative_modifier IS NULL`,
		modifier, userID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// ClearNegativeModifierTx removes the penalty modifier from the user's equipped
// title (FR-TITLE-04 recovery). Returns true if a modifier was cleared.
func (r *TitleRepo) ClearNegativeModifierTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID) (bool, error) {
	tag, err := tx.Exec(ctx,
		`UPDATE user_titles SET negative_modifier=NULL
		 WHERE user_id=$1 AND is_equipped=true AND negative_modifier IS NOT NULL`,
		userID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// FindPenalizedTitleIDTx returns the user_titles.id of the best candidate to
// recover with a defense ticket: prefers is_equipped, then is_displayed. If no
// penalized row exists it returns (uuid.Nil, nil).
func (r *TitleRepo) FindPenalizedTitleIDTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	err := tx.QueryRow(ctx,
		`SELECT id FROM user_titles
		 WHERE user_id=$1 AND negative_modifier IS NOT NULL
		 ORDER BY is_equipped DESC, is_displayed DESC
		 LIMIT 1`,
		userID).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return uuid.Nil, nil
		}
		return uuid.Nil, err
	}
	return id, nil
}

// ClearNegativeModifierByIDTx sets negative_modifier=NULL on a specific user_titles row.
func (r *TitleRepo) ClearNegativeModifierByIDTx(ctx context.Context, tx pgx.Tx, userTitleID uuid.UUID) error {
	_, err := tx.Exec(ctx,
		`UPDATE user_titles SET negative_modifier=NULL WHERE id=$1`, userTitleID)
	return err
}

// ClearNegativeModifier is a non-tx wrapper (used by shop defense purchase).
func (r *TitleRepo) ClearNegativeModifier(ctx context.Context, userID uuid.UUID) (bool, error) {
	tag, err := r.Pool.Exec(ctx,
		`UPDATE user_titles SET negative_modifier=NULL
		 WHERE user_id=$1 AND is_equipped=true AND negative_modifier IS NOT NULL`,
		userID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// ListUserTitles returns the user's titles joined with the master.
func (r *TitleRepo) ListUserTitles(ctx context.Context, userID uuid.UUID) ([]*models.UserTitle, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT ut.id, ut.is_equipped, ut.is_displayed, ut.negative_modifier, ut.acquired_at,
		        t.id, t.name, t.grade, t.color_hex, t.icon_url
		 FROM user_titles ut
		 JOIN titles t ON t.id = ut.title_id
		 WHERE ut.user_id=$1
		 ORDER BY ut.acquired_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.UserTitle
	for rows.Next() {
		ut := &models.UserTitle{}
		if err := rows.Scan(&ut.ID, &ut.IsEquipped, &ut.IsDisplayed, &ut.NegativeModifier, &ut.AcquiredAt,
			&ut.Title.ID, &ut.Title.Name, &ut.Title.Grade, &ut.Title.ColorHex, &ut.Title.IconURL); err != nil {
			return nil, err
		}
		out = append(out, ut)
	}
	return out, rows.Err()
}

// EquippedFor returns the currently equipped title for a user, or (nil,nil) if none.
func (r *TitleRepo) EquippedFor(ctx context.Context, userID uuid.UUID) (*models.UserTitle, error) {
	row := r.Pool.QueryRow(ctx,
		`SELECT ut.id, ut.is_equipped, ut.is_displayed, ut.negative_modifier, ut.acquired_at,
		        t.id, t.name, t.grade, t.color_hex, t.icon_url
		 FROM user_titles ut
		 JOIN titles t ON t.id = ut.title_id
		 WHERE ut.user_id=$1 AND ut.is_equipped=true LIMIT 1`, userID)
	ut := &models.UserTitle{}
	err := row.Scan(&ut.ID, &ut.IsEquipped, &ut.IsDisplayed, &ut.NegativeModifier, &ut.AcquiredAt,
		&ut.Title.ID, &ut.Title.Name, &ut.Title.Grade, &ut.Title.ColorHex, &ut.Title.IconURL)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return ut, nil
}

// SetEquipped sets is_equipped exclusively (other titles for the user are unequipped).
func (r *TitleRepo) SetEquipped(ctx context.Context, userID, userTitleID uuid.UUID, equip bool) error {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if equip {
		if _, err := tx.Exec(ctx, `UPDATE user_titles SET is_equipped=false WHERE user_id=$1`, userID); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE user_titles SET is_equipped=$1 WHERE id=$2 AND user_id=$3`, equip, userTitleID, userID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *TitleRepo) SetDisplayed(ctx context.Context, userID, userTitleID uuid.UUID, displayed bool) error {
	_, err := r.Pool.Exec(ctx, `UPDATE user_titles SET is_displayed=$1 WHERE id=$2 AND user_id=$3`, displayed, userTitleID, userID)
	return err
}

// DisplayedTitlesForUser returns titles flagged is_displayed for public showcase.
// 페널티(`negative_modifier`)도 사용자 컨텍스트에서 함께 반환한다 — 쇼케이스에서
// 칭호 옆에 [모디파이어] 마커가 보이도록 하기 위함.
func (r *TitleRepo) DisplayedTitlesForUser(ctx context.Context, userID uuid.UUID) ([]*models.Title, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT t.id, t.name, t.grade, t.color_hex, t.icon_url, ut.negative_modifier
		 FROM user_titles ut JOIN titles t ON t.id = ut.title_id
		 WHERE ut.user_id=$1 AND ut.is_displayed=true
		 ORDER BY ut.acquired_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.Title
	for rows.Next() {
		t := &models.Title{}
		if err := rows.Scan(&t.ID, &t.Name, &t.Grade, &t.ColorHex, &t.IconURL, &t.NegativeModifier); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}
