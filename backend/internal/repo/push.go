package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PushRepo struct{ Pool *pgxpool.Pool }

func NewPushRepo(p *pgxpool.Pool) *PushRepo { return &PushRepo{Pool: p} }

func (r *PushRepo) Subscribe(ctx context.Context, userID uuid.UUID, endpoint, p256dh, auth string) error {
	_, err := r.Pool.Exec(ctx,
		`INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth) VALUES($1,$2,$3,$4)
		 ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth`,
		userID, endpoint, p256dh, auth)
	return err
}
