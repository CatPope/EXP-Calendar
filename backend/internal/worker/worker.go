// Package worker runs the background loop for schedule reminders (FR-NOTI-02)
// and the OVERDUE sweep + title penalty (FR-TITLE-03).
//
// Web Push delivery itself is abstracted behind Notifier. When VAPID keys are not
// configured the notifier is a no-op that only logs — the scheduling/penalty logic
// still runs. Wiring a real Web Push library (VAPID-signed aes128gcm) is the only
// remaining step to deliver to browsers; see Notifier.Send.
package worker

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Notifier delivers a push payload to a subscription. The logging implementation
// is used when no VAPID keys are configured.
type Notifier interface {
	Send(ctx context.Context, endpoint, p256dh, auth, title, body string) error
}

// LogNotifier logs would-be pushes. Swap for a real Web Push sender when VAPID
// keys are present.
type LogNotifier struct{ Enabled bool }

func (n LogNotifier) Send(_ context.Context, endpoint, _, _, title, body string) error {
	if n.Enabled {
		log.Printf("[push] -> %s : %s — %s", truncate(endpoint, 40), title, body)
	}
	return nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

// Worker ticks every interval to fire reminders and sweep overdue schedules.
type Worker struct {
	Pool     *pgxpool.Pool
	Notifier Notifier
	Interval time.Duration
}

func New(pool *pgxpool.Pool, n Notifier) *Worker {
	return &Worker{Pool: pool, Notifier: n, Interval: time.Minute}
}

// Start launches the loop until ctx is cancelled.
func (w *Worker) Start(ctx context.Context) {
	go func() {
		t := time.NewTicker(w.Interval)
		defer t.Stop()
		// run once promptly on boot
		w.tick(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				w.tick(ctx)
			}
		}
	}()
}

func (w *Worker) tick(ctx context.Context) {
	if err := w.sendReminders(ctx); err != nil {
		log.Printf("[worker] reminders: %v", err)
	}
	if err := w.sweepOverdue(ctx); err != nil {
		log.Printf("[worker] overdue: %v", err)
	}
}

// sendReminders finds PENDING schedules whose due_date is within the user's
// reminder window, delivers a push (best-effort), and marks them sent once.
func (w *Worker) sendReminders(ctx context.Context) error {
	rows, err := w.Pool.Query(ctx,
		`SELECT s.id, s.title, ps.endpoint, ps.p256dh, ps.auth
		 FROM schedules s
		 JOIN user_settings us ON us.user_id = s.user_id
		 JOIN push_subscriptions ps ON ps.user_id = s.user_id
		 WHERE s.status='PENDING' AND s.reminder_sent_at IS NULL
		   AND s.due_date > now()
		   AND s.due_date <= now() + (us.reminder_minutes || ' minutes')::interval
		   AND COALESCE((us.notification_prefs->>'schedule_reminder')::boolean, true)
		   AND COALESCE((us.notification_prefs->>'push')::boolean, true)`)
	if err != nil {
		return err
	}
	type job struct {
		id                       string
		title, ep, p256dh, auth string
	}
	var jobs []job
	for rows.Next() {
		var j job
		if err := rows.Scan(&j.id, &j.title, &j.ep, &j.p256dh, &j.auth); err != nil {
			rows.Close()
			return err
		}
		jobs = append(jobs, j)
	}
	rows.Close()

	for _, j := range jobs {
		_ = w.Notifier.Send(ctx, j.ep, j.p256dh, j.auth, "일정 알림", j.title+" 예정 시간이 다가옵니다.")
		if _, err := w.Pool.Exec(ctx,
			`UPDATE schedules SET reminder_sent_at=now() WHERE id=$1`, j.id); err != nil {
			return err
		}
	}
	return nil
}

// sweepOverdue flips past-due PENDING schedules to OVERDUE, bumps the user's
// cumulative overdue_count, and attaches the "게으른" penalty modifier to the
// equipped title (FR-TITLE-03). Recovery is handled on completion/defense use.
func (w *Worker) sweepOverdue(ctx context.Context) error {
	rows, err := w.Pool.Query(ctx,
		`UPDATE schedules SET status='OVERDUE', updated_at=now()
		 WHERE status='PENDING' AND due_date < now()
		 RETURNING user_id`)
	if err != nil {
		return err
	}
	counts := map[string]int{}
	var order []string
	for rows.Next() {
		var uid string
		if err := rows.Scan(&uid); err != nil {
			rows.Close()
			return err
		}
		if _, seen := counts[uid]; !seen {
			order = append(order, uid)
		}
		counts[uid]++
	}
	rows.Close()

	for _, uid := range order {
		if _, err := w.Pool.Exec(ctx,
			`UPDATE users SET overdue_count = overdue_count + $1 WHERE id=$2`, counts[uid], uid); err != nil {
			return err
		}
		// attach penalty modifier to equipped title if not already present
		if _, err := w.Pool.Exec(ctx,
			`UPDATE user_titles SET negative_modifier='게으른'
			 WHERE user_id=$1 AND is_equipped=true AND negative_modifier IS NULL`, uid); err != nil {
			return err
		}
	}
	return nil
}
