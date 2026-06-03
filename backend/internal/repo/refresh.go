package repo

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RefreshRepo struct{ Pool *pgxpool.Pool }

func NewRefreshRepo(p *pgxpool.Pool) *RefreshRepo { return &RefreshRepo{Pool: p} }

func (r *RefreshRepo) Store(ctx context.Context, token string, userID uuid.UUID, expiresAt time.Time) error {
	_, err := r.Pool.Exec(ctx,
		`INSERT INTO refresh_tokens(token, user_id, expires_at) VALUES($1,$2,$3)`,
		token, userID, expiresAt)
	return err
}

func (r *RefreshRepo) Find(ctx context.Context, token string) (uuid.UUID, time.Time, error) {
	row := r.Pool.QueryRow(ctx, `SELECT user_id, expires_at FROM refresh_tokens WHERE token=$1`, token)
	var uid uuid.UUID
	var exp time.Time
	if err := row.Scan(&uid, &exp); err != nil {
		return uuid.Nil, time.Time{}, err
	}
	return uid, exp, nil
}

func (r *RefreshRepo) Delete(ctx context.Context, token string) error {
	_, err := r.Pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE token=$1`, token)
	return err
}
