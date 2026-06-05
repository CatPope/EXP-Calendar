package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ShowcaseHandler struct {
	Users   *repo.UserRepo
	Titles  *repo.TitleRepo
	Rewards *repo.RewardRepo
	Quests  *repo.QuestRepo
	Stats   *repo.StatsRepo
}

func NewShowcaseHandler(u *repo.UserRepo, t *repo.TitleRepo, r *repo.RewardRepo, q *repo.QuestRepo, s *repo.StatsRepo) *ShowcaseHandler {
	return &ShowcaseHandler{Users: u, Titles: t, Rewards: r, Quests: q, Stats: s}
}

type recommendationRow struct {
	UserID         uuid.UUID `json:"user_id"`
	DisplayName    string    `json:"display_name"`
	Level          int       `json:"level"`
	EquippedTitle  any       `json:"equipped_title"`
	CharacterSkin  string    `json:"character_skin"`
	PersonaName    string    `json:"persona_name"`
	StatusMessage  string    `json:"status_message"`
	ActiveCosmetic string    `json:"active_cosmetic"`
}

func (h *ShowcaseHandler) Recommendations(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	// Optional ?q= filters by display name (FR-SOC-04 search); empty → top recommendations.
	q := strings.TrimSpace(c.Query("q"))
	var users []*models.User
	var err error
	if q != "" {
		users, err = h.Users.SearchShowcaseUsers(c.Request.Context(), uid, q, 20)
	} else {
		users, err = h.Users.ListShowcaseUsers(c.Request.Context(), uid, 20)
	}
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	out := make([]recommendationRow, 0, len(users))
	for _, u := range users {
		var eq any = nil
		if ut, _ := h.Titles.EquippedFor(c.Request.Context(), u.ID); ut != nil {
			eq = models.EquippedTitle{
				ID:               ut.Title.ID,
				Name:             ut.Title.Name,
				Grade:            ut.Title.Grade,
				ColorHex:         ut.Title.ColorHex,
				NegativeModifier: ut.NegativeModifier,
			}
		}
		out = append(out, recommendationRow{
			UserID:         u.ID,
			DisplayName:    u.DisplayName,
			Level:          u.Level,
			EquippedTitle:  eq,
			CharacterSkin:  u.CharacterSkin,
			PersonaName:    u.PersonaName,
			StatusMessage:  u.StatusMessage,
			ActiveCosmetic: u.ActiveCosmetic,
		})
	}
	Respond(c, http.StatusOK, out)
}

type showcaseProfileResponse struct {
	UserID              uuid.UUID            `json:"user_id"`
	DisplayName         string               `json:"display_name"`
	Level               int                  `json:"level"`
	RatingGrade         string               `json:"rating_grade"`
	EquippedTitle       any                  `json:"equipped_title"`
	DisplayedTitles     []*models.Title      `json:"displayed_titles"`
	PersonaShowcaseText string               `json:"persona_showcase_text"`
	PersonaLLMOutput    string               `json:"persona_llm_output"`
	PersonaName         string               `json:"persona_name"`
	StatusMessage       string               `json:"status_message"`
	CharacterSkin       string               `json:"character_skin"`
	Grass               map[string]int       `json:"grass"`
	ActiveCosmetic      string               `json:"active_cosmetic"`
	// 통계 공유 토글. false 인 사용자는 Summary 가 nil 로 빠진다.
	StatsPublic bool                  `json:"stats_public"`
	Summary     *models.StatsSummary `json:"summary,omitempty"`
}

func (h *ShowcaseHandler) Get(c *gin.Context) {
	viewerID, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	target, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid user_id")
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), target)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}

	var equipped any = nil
	if ut, _ := h.Titles.EquippedFor(c.Request.Context(), target); ut != nil {
		equipped = models.EquippedTitle{
			ID:               ut.Title.ID,
			Name:             ut.Title.Name,
			Grade:            ut.Title.Grade,
			ColorHex:         ut.Title.ColorHex,
			NegativeModifier: ut.NegativeModifier,
		}
	}
	displayed, _ := h.Titles.DisplayedTitlesForUser(c.Request.Context(), target)

	to := timeNow().AddDate(0, 0, 1)
	from := to.AddDate(-1, 0, 0)
	grass, _ := h.Rewards.GrassByDay(c.Request.Context(), target, from, to)
	if grass == nil {
		grass = map[string]int{}
	}

	// Side effect: visiting OTHER user's showcase auto-completes + awards the
	// viewer's VISIT_SHOWCASE quest.
	if viewerID != target {
		_, _, _, _ = AwardQuestAuto(c.Request.Context(), h.Quests, h.Users, viewerID, kstToday(), "VISIT_SHOWCASE")
	}

	// 통계 공유 토글이 켜져 있으면 target 의 풀 StatsSummary 를 함께 반환한다.
	// 본인 페이지(viewer == target)는 토글과 무관하게 항상 자기 데이터를 본다.
	var summary *models.StatsSummary
	if u.StatsPublic || viewerID == target {
		current, _ := h.Rewards.ConsecutiveCompletionDays(c.Request.Context(), target, kstToday(), 120)
		if s, err := h.Stats.SummaryFull(c.Request.Context(), target, current); err == nil {
			summary = &s
		}
	} else {
		// 비공개 사용자의 잔디도 가린다. (level 등 공개 정보는 유지)
		grass = map[string]int{}
	}

	Respond(c, http.StatusOK, showcaseProfileResponse{
		UserID:              u.ID,
		DisplayName:         u.DisplayName,
		Level:               u.Level,
		RatingGrade:         ratingGrade(u.Level),
		EquippedTitle:       equipped,
		DisplayedTitles:     displayed,
		PersonaShowcaseText: u.PersonaShowcaseText,
		PersonaLLMOutput:    u.PersonaLLMOutput,
		PersonaName:         u.PersonaName,
		StatusMessage:       u.StatusMessage,
		CharacterSkin:       u.CharacterSkin,
		Grass:               grass,
		ActiveCosmetic:      u.ActiveCosmetic,
		StatsPublic:         u.StatsPublic,
		Summary:             summary,
	})
}

// Series 는 쇼케이스 통계 추이 차트용 series 데이터를 반환한다.
// 본인 페이지 또는 target.StatsPublic == true 일 때만 데이터를 제공하고,
// 그 외엔 403 으로 응답한다.
func (h *ShowcaseHandler) Series(c *gin.Context) {
	viewerID, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	target, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "invalid user_id")
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), target)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	if !u.StatsPublic && viewerID != target {
		RespondErr(c, http.StatusForbidden, "STATS_PRIVATE", "이 사용자는 통계를 비공개로 설정했습니다")
		return
	}

	period := c.DefaultQuery("period", "week")
	kstLoc := kstLocation()
	nowKST := timeNow().In(kstLoc)
	to := time.Date(nowKST.Year(), nowKST.Month(), nowKST.Day()+1, 0, 0, 0, 0, kstLoc)
	from, granularity := periodWindow(period, to)
	out, err := h.Rewards.SeriesAggregated(c.Request.Context(), target, from, to, granularity)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if out == nil {
		out = []map[string]any{}
	}
	Respond(c, http.StatusOK, out)
}

// ratingGrade derives a simple letter grade from level (no detailed leak per FR-SOC-03).
func ratingGrade(level int) string {
	switch {
	case level >= 50:
		return "S"
	case level >= 20:
		return "A"
	case level >= 10:
		return "B"
	case level >= 5:
		return "C"
	default:
		return "D"
	}
}

// ensure time import is used (Windows static analyzers sometimes get confused)
var _ = time.Now
