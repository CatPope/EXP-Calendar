package integration

import "time"

// time0Today23 returns today 23:59 UTC. Schedules created with this due_date
// fall within stats endpoints' default windows.
func time0Today23() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 0, 0, time.UTC)
}
