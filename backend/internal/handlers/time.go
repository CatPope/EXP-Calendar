package handlers

import "time"

// timeNow is a tiny indirection so tests can patch it later if desired.
var timeNow = func() time.Time { return time.Now() }

// kstToday returns the current date in Asia/Seoul, formatted to start-of-day.
func kstToday() time.Time {
	loc, err := time.LoadLocation("Asia/Seoul")
	if err != nil {
		loc = time.FixedZone("KST", 9*3600)
	}
	now := timeNow().In(loc)
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
}
