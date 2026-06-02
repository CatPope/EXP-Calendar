// Package models holds shared data structures. Keep these aligned with both
// the SQL schema and the spec JSON contracts (api_and_rules.md).
package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                    uuid.UUID `json:"id"`
	Email                 string    `json:"email"`
	DisplayName           string    `json:"display_name"`
	GoogleSub             *string   `json:"-"`
	AccountStatus         string    `json:"account_status"`
	Level                 int       `json:"level"`
	TotalExp              int       `json:"total_exp"`
	CurrentPoints         int       `json:"current_points"`
	DailyPointsEarned     int       `json:"daily_points_earned"`
	DailyPointsEarnedDate time.Time `json:"-"`
	Tendency              string    `json:"tendency"`
	PersonaCharacterType  string    `json:"persona_character_type"`
	PersonaDefinition     string    `json:"persona_definition"`
	PersonaTokens         int       `json:"persona_tokens"`
	PersonaShowcaseText   string    `json:"persona_showcase_text"`
	PersonaLLMOutput      string    `json:"persona_llm_output"`
	CharacterSkin         string    `json:"character_skin"`
	SummonTickets         int       `json:"summon_tickets"`
	PityCounter           int       `json:"pity_counter"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"-"`
}

type Schedule struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"-"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	Difficulty    string     `json:"difficulty"`
	Status        string     `json:"status"`
	DueDate       time.Time  `json:"due_date"`
	GoogleEventID *string    `json:"google_event_id"`
	CompletedAt   *time.Time `json:"completed_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

type Title struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Grade       string    `json:"grade"`
	ColorHex    string    `json:"color_hex"`
	IconURL     string    `json:"icon_url"`
	Description string    `json:"description,omitempty"`
	Condition   string    `json:"-"`
}

type UserTitle struct {
	ID               uuid.UUID `json:"id"`
	Title            Title     `json:"title"`
	IsEquipped       bool      `json:"is_equipped"`
	IsDisplayed      bool      `json:"is_displayed"`
	NegativeModifier *string   `json:"negative_modifier"`
	AcquiredAt       time.Time `json:"acquired_at"`
}

type EquippedTitle struct {
	ID               uuid.UUID `json:"id"`
	Name             string    `json:"name"`
	Grade            string    `json:"grade"`
	ColorHex         string    `json:"color_hex"`
	NegativeModifier *string   `json:"negative_modifier"`
}

type Item struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Price       int       `json:"price"`
	Description string    `json:"description"`
	Effect      string    `json:"effect"`
}

type Purchase struct {
	ID          uuid.UUID `json:"id"`
	ItemID      uuid.UUID `json:"item_id"`
	PricePaid   int       `json:"price_paid"`
	PurchasedAt time.Time `json:"purchased_at"`
}

type Quest struct {
	QuestType    string `json:"quest_type"`
	Completed    bool   `json:"completed"`
	RewardPoints int    `json:"reward_points"`
}

type RewardEvent struct {
	ID           uuid.UUID  `json:"id"`
	ScheduleID   *uuid.UUID `json:"schedule_id"`
	Source       string     `json:"source"`
	ExpGained    int        `json:"exp_gained"`
	PointsGained int        `json:"points_gained"`
	OccurredAt   time.Time  `json:"occurred_at"`
}

// SeriesPoint is the per-day success/fail row returned by /api/stats/series.
type SeriesPoint struct {
	Date    string `json:"date"`
	Success int    `json:"success"`
	Fail    int    `json:"fail"`
}

// Character is a gacha catalog entry (도감 마스터).
type Character struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Rarity    string    `json:"rarity"`
	SpriteKey string    `json:"sprite_key"`
	IsPickup  bool      `json:"is_pickup"`
}

// OwnedCharacter is a user's collection row (Character + owned count + equipped flag).
type OwnedCharacter struct {
	Character
	Count    int  `json:"count"`
	Equipped bool  `json:"equipped"`
}

// SummonDraw is a single gacha result returned by /api/summon/* .
type SummonDraw struct {
	Character    Character `json:"character"`
	IsNew        bool      `json:"is_new"`
	RefundPoints int       `json:"refund_points"`
}

// SummonResult wraps one or more draws plus the resulting balances.
type SummonResult struct {
	Draws          []SummonDraw `json:"draws"`
	SpentPoints    int          `json:"spent_points"`
	SpentTickets   int          `json:"spent_tickets"`
	RefundedPoints int          `json:"refunded_points"`
	RemainingPoints int         `json:"remaining_points"`
	RemainingTickets int        `json:"remaining_tickets"`
	PityCounter    int          `json:"pity_counter"`
}

// Settings is the unified user settings row (FR-SET-01~06).
type Settings struct {
	Language         string         `json:"language"`
	Timezone         string         `json:"timezone"`
	WeekStart        string         `json:"week_start"`
	TimeFormat       string         `json:"time_format"`
	Theme            string         `json:"theme"`
	CharacterScale   float64        `json:"character_scale"`
	GcalSyncEnabled  bool           `json:"gcal_sync_enabled"`
	NotificationPrefs map[string]bool `json:"notification_prefs"`
	ReminderMinutes  int            `json:"reminder_minutes"`
}

// StatsSummary is GET /api/stats/summary (rating + streaks for the caller).
type StatsSummary struct {
	TotalCompleted int    `json:"total_completed"`
	TotalFailed    int    `json:"total_failed"`
	SuccessRate    float64 `json:"success_rate"`
	RatingGrade    string `json:"rating_grade"`
	CurrentStreak  int    `json:"current_streak"`
	LongestStreak  int    `json:"longest_streak"`
}

// ShowcaseSummary is one row of GET /api/showcase (recommendations).
type ShowcaseSummary struct {
	UserID        uuid.UUID      `json:"user_id"`
	DisplayName   string         `json:"display_name"`
	Level         int            `json:"level"`
	EquippedTitle *EquippedTitle `json:"equipped_title,omitempty"`
}

// ShowcaseProfile is GET /api/showcase/:user_id.
type ShowcaseProfile struct {
	UserID              uuid.UUID      `json:"user_id"`
	DisplayName         string         `json:"display_name"`
	Level               int            `json:"level"`
	RatingGrade         string         `json:"rating_grade"`
	EquippedTitle       *EquippedTitle `json:"equipped_title,omitempty"`
	DisplayedTitles     []*Title       `json:"displayed_titles"`
	PersonaShowcaseText string         `json:"persona_showcase_text"`
	PersonaLLMOutput    string         `json:"persona_llm_output"`
	Grass               map[string]int `json:"grass"`
}
