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

	"github.com/expcalendar/backend/internal/repo"
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
	Pool          *pgxpool.Pool
	Notifier      Notifier
	Interval      time.Duration
	Users         *repo.UserRepo
	dormancyEvery time.Duration
	lastDormancy  time.Time
}

func New(pool *pgxpool.Pool, n Notifier) *Worker {
	return &Worker{
		Pool:          pool,
		Notifier:      n,
		Interval:      time.Minute,
		Users:         repo.NewUserRepo(pool),
		dormancyEvery: time.Hour,
	}
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
	// 휴면 정책(FR-DORM-01/06): 분 단위로 돌릴 필요 없으므로 시간 간격으로 throttle.
	now := time.Now()
	if w.dormancyEvery == 0 || now.Sub(w.lastDormancy) >= w.dormancyEvery {
		w.lastDormancy = now
		if err := w.processDormancy(ctx, now); err != nil {
			log.Printf("[worker] dormancy: %v", err)
		}
	}
}

// processDormancy runs the daily-ish dormancy policy:
//   - Send 13일차 경고 알림 (FR-NOTI-03 / FR-DORM-06).
//   - 14일 이상 미접속 ACTIVE 계정을 DORMANT 로 전환 (FR-DORM-01).
//
// Returns the first non-nil error so failures are logged, but the function
// always attempts both passes (warning before transition) so a transient push
// outage cannot block the dormancy flip.
func (w *Worker) processDormancy(ctx context.Context, now time.Time) error {
	var firstErr error

	candidates, err := w.Users.ListDormancyWarningCandidates(ctx, now)
	if err != nil {
		firstErr = err
	} else {
		for _, c := range candidates {
			_ = w.Notifier.Send(ctx, c.Endpoint, c.P256dh, c.Auth,
				"휴면 전환 임박",
				"내일까지 접속이 없으면 휴면 상태로 전환됩니다.")
			if mErr := w.Users.MarkDormancyWarningSent(ctx, c.UserID, now); mErr != nil && firstErr == nil {
				firstErr = mErr
			}
		}
	}

	if n, sErr := w.Users.SweepDormant(ctx, now); sErr != nil {
		if firstErr == nil {
			firstErr = sErr
		}
	} else if n > 0 {
		log.Printf("[worker] dormancy: %d accounts → DORMANT", n)
	}
	return firstErr
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
