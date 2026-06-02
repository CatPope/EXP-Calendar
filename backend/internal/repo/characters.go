package repo

import (
	"context"

	"github.com/expcalendar/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CharacterRepo handles the gacha catalog, user collection and summon log.
type CharacterRepo struct{ Pool *pgxpool.Pool }

func NewCharacterRepo(p *pgxpool.Pool) *CharacterRepo { return &CharacterRepo{Pool: p} }

// ListCatalog returns the full character catalog ordered by rarity then name.
func (r *CharacterRepo) ListCatalog(ctx context.Context) ([]*models.Character, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT id, name, rarity, sprite_key, is_pickup FROM characters
		 ORDER BY CASE rarity WHEN 'LEGENDARY' THEN 0 WHEN 'EPIC' THEN 1 WHEN 'RARE' THEN 2 ELSE 3 END, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.Character
	for rows.Next() {
		ch := &models.Character{}
		if err := rows.Scan(&ch.ID, &ch.Name, &ch.Rarity, &ch.SpriteKey, &ch.IsPickup); err != nil {
			return nil, err
		}
		out = append(out, ch)
	}
	return out, rows.Err()
}

// ListOwned returns the user's collection (Character + count + equipped flag).
func (r *CharacterRepo) ListOwned(ctx context.Context, userID uuid.UUID) ([]*models.OwnedCharacter, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT c.id, c.name, c.rarity, c.sprite_key, c.is_pickup, uc.count,
		        (u.active_character_id = c.id) AS equipped
		 FROM user_characters uc
		 JOIN characters c ON c.id = uc.character_id
		 JOIN users u ON u.id = uc.user_id
		 WHERE uc.user_id=$1
		 ORDER BY CASE c.rarity WHEN 'LEGENDARY' THEN 0 WHEN 'EPIC' THEN 1 WHEN 'RARE' THEN 2 ELSE 3 END, c.name`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.OwnedCharacter
	for rows.Next() {
		oc := &models.OwnedCharacter{}
		var equipped *bool
		if err := rows.Scan(&oc.ID, &oc.Name, &oc.Rarity, &oc.SpriteKey, &oc.IsPickup, &oc.Count, &equipped); err != nil {
			return nil, err
		}
		oc.Equipped = equipped != nil && *equipped
		out = append(out, oc)
	}
	return out, rows.Err()
}

// RandomByRarityTx picks a random catalog character of the given rarity.
func (r *CharacterRepo) RandomByRarityTx(ctx context.Context, tx pgx.Tx, rarity string) (*models.Character, error) {
	row := tx.QueryRow(ctx,
		`SELECT id, name, rarity, sprite_key, is_pickup FROM characters
		 WHERE rarity=$1 ORDER BY random() LIMIT 1`, rarity)
	ch := &models.Character{}
	if err := row.Scan(&ch.ID, &ch.Name, &ch.Rarity, &ch.SpriteKey, &ch.IsPickup); err != nil {
		return nil, err
	}
	return ch, nil
}

// GrantTx inserts or increments the user_characters row. Returns isNew=true when
// the user did not previously own the character.
func (r *CharacterRepo) GrantTx(ctx context.Context, tx pgx.Tx, userID, characterID uuid.UUID) (bool, error) {
	var inserted bool
	err := tx.QueryRow(ctx,
		`INSERT INTO user_characters(user_id, character_id, count) VALUES($1,$2,1)
		 ON CONFLICT (user_id, character_id) DO UPDATE SET count = user_characters.count + 1
		 RETURNING (xmax = 0) AS inserted`,
		userID, characterID).Scan(&inserted)
	if err != nil {
		return false, err
	}
	return inserted, nil
}

// LogSummonTx records one summon draw.
func (r *CharacterRepo) LogSummonTx(ctx context.Context, tx pgx.Tx, userID, characterID uuid.UUID, costType string, pity int) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO summon_log(user_id, character_id, cost_type, pity_counter) VALUES($1,$2,$3,$4)`,
		userID, characterID, costType, pity)
	return err
}

// OwnsCharacter reports whether the user owns the given character.
func (r *CharacterRepo) OwnsCharacter(ctx context.Context, userID, characterID uuid.UUID) (bool, error) {
	var n int
	err := r.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM user_characters WHERE user_id=$1 AND character_id=$2`,
		userID, characterID).Scan(&n)
	return n > 0, err
}

// SetActive sets the user's equipped (active) character. Caller must verify ownership.
func (r *CharacterRepo) SetActive(ctx context.Context, userID, characterID uuid.UUID) error {
	_, err := r.Pool.Exec(ctx,
		`UPDATE users SET active_character_id=$1, updated_at=now() WHERE id=$2`,
		characterID, userID)
	return err
}
