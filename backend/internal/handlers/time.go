package handlers

import "time"

// timeNow is a tiny indirection so tests can patch it later if desired.
var timeNow = func() time.Time { return time.Now() }

// kstLocation returns the Asia/Seoul tz, falling back to a fixed UTC+9 zone
// if the system tzdata is unavailable (some minimal containers).
func kstLocation() *time.Location {
	loc, err := time.LoadLocation("Asia/Seoul")
	if err != nil {
		return time.FixedZone("KST", 9*3600)
	}
	return loc
}

// kstToday returns the current date in Asia/Seoul, formatted to start-of-day.
func kstToday() time.Time {
	loc := kstLocation()
	now := timeNow().In(loc)
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
}

// RangeKST returns [from, to) for the given anchor day expressed in KST:
//   - from = start-of-day in KST
//   - to   = start of the next day in KST
//
// Callers can pass any time.Time; only its KST calendar date is used.
func RangeKST(anchor time.Time) (time.Time, time.Time) {
	loc := kstLocation()
	a := anchor.In(loc)
	from := time.Date(a.Year(), a.Month(), a.Day(), 0, 0, 0, 0, loc)
	return from, from.AddDate(0, 0, 1)
}

// periodWindow returns (from, granularity) for the given trend-chart period.
// to 는 호출자가 미리 계산한 exclusive upper bound (보통 KST 다음날 0시).
//   - week  : 7일,   day 버킷
//   - month : 12개월, month 버킷
//   - year  : 10년,   year 버킷
// 알 수 없는 값은 week 로 폴백.
func periodWindow(period string, to time.Time) (time.Time, string) {
	switch period {
	case "month":
		return to.AddDate(0, -12, 0), "month"
	case "year":
		return to.AddDate(-10, 0, 0), "year"
	default:
		return to.AddDate(0, 0, -7), "day"
	}
}
