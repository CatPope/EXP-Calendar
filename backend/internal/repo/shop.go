package repo

import (
	"context"

	"github.com/expcalendar/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ShopRepo struct{ Pool *pgxpool.Pool }

func NewShopRepo(p *pgxpool.Pool) *ShopRepo { return &ShopRepo{Pool: p} }

func (r *ShopRepo) ListItems(ctx context.Context) ([]*models.Item, error) {
	rows, err := r.Pool.Query(ctx,
		`SELECT id, name, category, price, description, effect FROM items ORDER BY price ASC, name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.Item
	for rows.Next() {
		it := &models.Item{}
		if err := rows.Scan(&it.ID, &it.Name, &it.Category, &it.Price, &it.Description, &it.Effect); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *ShopRepo) GetItem(ctx context.Context, id uuid.UUID) (*models.Item, error) {
	row := r.Pool.QueryRow(ctx, `SELECT id, name, category, price, description, effect FROM items WHERE id=$1`, id)
	it := &models.Item{}
	if err := row.Scan(&it.ID, &it.Name, &it.Category, &it.Price, &it.Description, &it.Effect); err != nil {
		return nil, err
	}
	return it, nil
}

func (r *ShopRepo) RecordPurchase(ctx context.Context, userID, itemID uuid.UUID, pricePaid int) (*models.Purchase, error) {
	row := r.Pool.QueryRow(ctx,
		`INSERT INTO purchases(user_id, item_id, price_paid) VALUES($1,$2,$3)
		 RETURNING id, item_id, price_paid, purchased_at`,
		userID, itemID, pricePaid)
	p := &models.Purchase{}
	if err := row.Scan(&p.ID, &p.ItemID, &p.PricePaid, &p.PurchasedAt); err != nil {
		return nil, err
	}
	return p, nil
}
