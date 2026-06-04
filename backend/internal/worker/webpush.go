package worker

import (
	"context"
	"encoding/json"
	"log"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/jackc/pgx/v5/pgxpool"
)

// WebPushNotifier delivers real VAPID-signed Web Push messages (FR-NOTI-01/02).
// Stale subscriptions (404/410) are pruned from push_subscriptions.
type WebPushNotifier struct {
	Public  string
	Private string
	Subject string
	Pool    *pgxpool.Pool
}

func NewWebPushNotifier(public, private, subject string, pool *pgxpool.Pool) *WebPushNotifier {
	if subject == "" {
		subject = "mailto:admin@expcalendar.local"
	}
	return &WebPushNotifier{Public: public, Private: private, Subject: subject, Pool: pool}
}

// Send encrypts and POSTs the payload to the push service. The browser service
// worker receives `{ title, body }` JSON.
func (n *WebPushNotifier) Send(ctx context.Context, endpoint, p256dh, auth, title, body string) error {
	payload, _ := json.Marshal(map[string]string{"title": title, "body": body})
	sub := &webpush.Subscription{
		Endpoint: endpoint,
		Keys:     webpush.Keys{P256dh: p256dh, Auth: auth},
	}
	resp, err := webpush.SendNotificationWithContext(ctx, payload, sub, &webpush.Options{
		Subscriber:      n.Subject,
		VAPIDPublicKey:  n.Public,
		VAPIDPrivateKey: n.Private,
		TTL:             60,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	// 404/410 → subscription expired/unsubscribed; remove it.
	if resp.StatusCode == 404 || resp.StatusCode == 410 {
		if _, derr := n.Pool.Exec(ctx, `DELETE FROM push_subscriptions WHERE endpoint=$1`, endpoint); derr != nil {
			log.Printf("[push] prune stale sub: %v", derr)
		}
	}
	return nil
}
