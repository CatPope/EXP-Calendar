package integration

import (
	"net/http"
	"time"
)

// ---------- domain shapes (only what tests assert on) ----------

type Me struct {
	ID                   string  `json:"id"`
	Email                string  `json:"email"`
	DisplayName          string  `json:"display_name"`
	Level                int     `json:"level"`
	TotalExp             int     `json:"total_exp"`
	ExpToNextLevel       int     `json:"exp_to_next_level"`
	CurrentPoints        int     `json:"current_points"`
	DailyPointsEarned    int     `json:"daily_points_earned"`
	DailyPointsCap       int     `json:"daily_points_cap"`
	AccountStatus        string  `json:"account_status"`
	PersonaCharacterType string  `json:"persona_character_type"`
	PersonaDefinition    string  `json:"persona_definition"`
	PersonaTokens        int     `json:"persona_tokens"`
	Tendency             string  `json:"tendency"`
	EquippedTitle        *Title  `json:"equipped_title"`
}

type Title struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Grade           string  `json:"grade"`
	ColorHex        string  `json:"color_hex"`
	IconURL         string  `json:"icon_url,omitempty"`
	Description     string  `json:"description,omitempty"`
	NegativeModifier *string `json:"negative_modifier,omitempty"`
}

type UserTitle struct {
	ID              string  `json:"id"`
	Title           Title   `json:"title"`
	IsEquipped      bool    `json:"is_equipped"`
	IsDisplayed     bool    `json:"is_displayed"`
	NegativeModifier *string `json:"negative_modifier,omitempty"`
	AcquiredAt      string  `json:"acquired_at"`
}

type Schedule struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Difficulty    string    `json:"difficulty"`
	Status        string    `json:"status"`
	DueDate       time.Time `json:"due_date"`
	GoogleEventID *string   `json:"google_event_id,omitempty"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type Reward struct {
	ExpGained       int     `json:"exp_gained"`
	PointsGained    int     `json:"points_gained"`
	LevelUp         bool    `json:"level_up"`
	NewLevel        *int    `json:"new_level,omitempty"`
	NewTitles       []Title `json:"new_titles"`
	DailyCapReached bool    `json:"daily_cap_reached"`
}

type CompleteResp struct {
	Schedule Schedule `json:"schedule"`
	Reward   Reward   `json:"reward"`
}

type Quest struct {
	QuestType    string `json:"quest_type"`
	Completed    bool   `json:"completed"`
	RewardPoints int    `json:"reward_points"`
}

type QuestComplete struct {
	Completed     bool `json:"completed"`
	RewardPoints  int  `json:"reward_points"`
	CurrentPoints int  `json:"current_points"`
}

type Item struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Price       int    `json:"price"`
	Description string `json:"description"`
	Effect      string `json:"effect"`
}

type Purchase struct {
	ID          string    `json:"id"`
	ItemID      string    `json:"item_id"`
	PricePaid   int       `json:"price_paid"`
	PurchasedAt time.Time `json:"purchased_at"`
}

type PurchaseResp struct {
	Purchase        Purchase `json:"purchase"`
	RemainingPoints int      `json:"remaining_points"`
}

type ShowcaseSummary struct {
	UserID        string `json:"user_id"`
	DisplayName   string `json:"display_name"`
	Level         int    `json:"level"`
	EquippedTitle *Title `json:"equipped_title"`
}

type ShowcaseDetail struct {
	UserID              string         `json:"user_id"`
	DisplayName         string         `json:"display_name"`
	Level               int            `json:"level"`
	RatingGrade         string         `json:"rating_grade"`
	EquippedTitle       *Title         `json:"equipped_title"`
	DisplayedTitles     []Title        `json:"displayed_titles"`
	Grass               map[string]int `json:"grass"`
	PersonaShowcaseText string         `json:"persona_showcase_text"`
	PersonaLLMOutput    string         `json:"persona_llm_output"`
}

type PersonaResp struct {
	CharacterType  string `json:"character_type"`
	LLMOutput      string `json:"llm_output"`
	ShowcaseText   string `json:"showcase_text,omitempty"`
	UsedDefinition bool   `json:"used_definition"`
}

type DefineResp struct {
	PersonaDefinition string `json:"persona_definition"`
	PersonaTokens     int    `json:"persona_tokens"`
}

// ---------- typed API wrappers ----------

// Me fetches /api/me.
func (c *Client) Me() *Me {
	c.t.Helper()
	var m Me
	c.MustDo(http.MethodGet, "/api/me", nil, &m)
	return &m
}

// Onboard sets tendency on the current user (FR-GAME-01).
func (c *Client) Onboard(tendency string) {
	c.t.Helper()
	c.MustDo(http.MethodPost, "/api/me/onboarding", map[string]string{"tendency": tendency}, nil)
}

// CreateSchedule helper: due-date defaults to today 23:59 UTC if zero.
func (c *Client) CreateSchedule(title, difficulty string, due time.Time) *Schedule {
	c.t.Helper()
	if due.IsZero() {
		now := time.Now().UTC()
		due = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 0, 0, time.UTC)
	}
	var s Schedule
	c.MustDo(http.MethodPost, "/api/schedules", map[string]any{
		"title":      title,
		"difficulty": difficulty,
		"due_date":   due.Format(time.RFC3339),
	}, &s)
	return &s
}

// CompleteSchedule POSTs /api/schedules/:id/complete.
func (c *Client) CompleteSchedule(id string) *CompleteResp {
	c.t.Helper()
	var r CompleteResp
	c.MustDo(http.MethodPost, "/api/schedules/"+id+"/complete", nil, &r)
	return &r
}

// QuestsToday fetches the 3 fixed daily quests.
func (c *Client) QuestsToday() []Quest {
	c.t.Helper()
	var qs []Quest
	c.MustDo(http.MethodGet, "/api/quests/today", nil, &qs)
	return qs
}

func (c *Client) CompleteQuest(qtype string) *QuestComplete {
	c.t.Helper()
	var r QuestComplete
	c.MustDo(http.MethodPost, "/api/quests/"+qtype+"/complete", nil, &r)
	return &r
}

func (c *Client) ShopItems() []Item {
	c.t.Helper()
	var items []Item
	c.MustDo(http.MethodGet, "/api/shop/items", nil, &items)
	return items
}

func (c *Client) Purchase(itemID string) (*PurchaseResp, error) {
	c.t.Helper()
	var r PurchaseResp
	err := c.Do(http.MethodPost, "/api/shop/purchase", map[string]string{"item_id": itemID}, &r)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (c *Client) MyTitles() []UserTitle {
	c.t.Helper()
	var ts []UserTitle
	c.MustDo(http.MethodGet, "/api/titles/me", nil, &ts)
	return ts
}

func (c *Client) EquipTitle(id string, equipped bool) *UserTitle {
	c.t.Helper()
	var t UserTitle
	c.MustDo(http.MethodPatch, "/api/titles/"+id+"/equip", map[string]any{"is_equipped": equipped}, &t)
	return &t
}

func (c *Client) PersonaGenerate(text string) *PersonaResp {
	c.t.Helper()
	var r PersonaResp
	c.MustDo(http.MethodPost, "/api/persona/generate", map[string]string{"text": text}, &r)
	return &r
}

func (c *Client) PersonaShowcase(text string) *PersonaResp {
	c.t.Helper()
	var r PersonaResp
	c.MustDo(http.MethodPost, "/api/persona/showcase", map[string]string{"text": text}, &r)
	return &r
}

func (c *Client) DefinePersona(definition string) (*DefineResp, error) {
	c.t.Helper()
	var r DefineResp
	err := c.Do(http.MethodPost, "/api/persona/define", map[string]string{"definition": definition}, &r)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (c *Client) ShowcaseList() []ShowcaseSummary {
	c.t.Helper()
	var s []ShowcaseSummary
	c.MustDo(http.MethodGet, "/api/showcase", nil, &s)
	return s
}

func (c *Client) ShowcaseUser(userID string) *ShowcaseDetail {
	c.t.Helper()
	var d ShowcaseDetail
	c.MustDo(http.MethodGet, "/api/showcase/"+userID, nil, &d)
	return &d
}

func (c *Client) Grass() map[string]int {
	c.t.Helper()
	var g map[string]int
	c.MustDo(http.MethodGet, "/api/stats/grass", nil, &g)
	return g
}

func (c *Client) Series(period string) []map[string]any {
	c.t.Helper()
	var s []map[string]any
	c.MustDo(http.MethodGet, "/api/stats/series?period="+period, nil, &s)
	return s
}

func (c *Client) SubscribePush(endpoint, p256dh, auth string) {
	c.t.Helper()
	c.MustDo(http.MethodPost, "/api/notifications/subscribe", map[string]string{
		"endpoint": endpoint,
		"p256dh":   p256dh,
		"auth":     auth,
	}, nil)
}
