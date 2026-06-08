// Package server is the single source of truth for HTTP route wiring.
//
// Route groups:
//   - GET  /health                  : uptime probe (public)
//   - POST /api/auth/google         : Google OAuth ID-token login (public)
//   - POST /api/auth/dev-login      : Dev convenience login (public, dev-mode only)
//   - POST /api/auth/refresh        : Refresh access token (public)
//   - All other /api/* routes       : Authed (Bearer access token required)
//   - POST /api/auth/logout         : Authed (token must be valid to revoke)
package server

import (
	"net/http"
	"time"

	"github.com/expcalendar/backend/internal/auth"
	"github.com/expcalendar/backend/internal/config"
	"github.com/expcalendar/backend/internal/handlers"
	"github.com/expcalendar/backend/internal/llm"
	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewRouter constructs the gin.Engine with every handler wired to its DAO.
// Each handler holds the deps it needs (pool for tx, repos, JWT, LLM, config).
func NewRouter(cfg *config.Config, pool *pgxpool.Pool) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// CORS — allowed origins come from config (ALLOWED_ORIGINS env).
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// --- shared singletons ------------------------------------------------
	jwtMgr := auth.NewJWTManager(cfg.JWTSecret, cfg.JWTAccessTTLMin, cfg.JWTRefreshTTLDays)
	llmClient := llm.NewClient(cfg.GeminiAPIKey, cfg.LLMModel, cfg.OllamaBaseURL, cfg.OllamaModel)

	// --- repos ------------------------------------------------------------
	users := repo.NewUserRepo(pool)
	schedules := repo.NewScheduleRepo(pool)
	titles := repo.NewTitleRepo(pool)
	quests := repo.NewQuestRepo(pool)
	shop := repo.NewShopRepo(pool)
	rewards := repo.NewRewardRepo(pool)
	refresh := repo.NewRefreshRepo(pool)
	push := repo.NewPushRepo(pool)
	stats := repo.NewStatsRepo(pool)
	characters := repo.NewCharacterRepo(pool)
	settings := repo.NewSettingsRepo(pool)

	// --- handlers ---------------------------------------------------------
	authH := handlers.NewAuthHandler(cfg, jwtMgr, users, refresh, titles)
	meH := handlers.NewMeHandler(users, titles)
	schedH := handlers.NewSchedulesHandler(pool, users, schedules, titles, quests, rewards, stats)
	questsH := handlers.NewQuestsHandler(pool, quests, users, schedules, rewards)
	shopH := handlers.NewShopHandler(pool, shop, users, titles)
	titlesH := handlers.NewTitlesHandler(pool, titles, stats, rewards)
	personaH := handlers.NewPersonaHandler(llmClient, users, titles)
	showcaseH := handlers.NewShowcaseHandler(users, titles, rewards, quests, stats)
	statsH := handlers.NewStatsHandler(rewards, stats)
	notifH := handlers.NewNotificationsHandler(push, cfg.VAPIDPublic)
	summonH := handlers.NewSummonHandler(pool, users, characters)
	settingsH := handlers.NewSettingsHandler(pool, settings, users)

	// --- health -----------------------------------------------------------
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// --- /api -------------------------------------------------------------
	api := r.Group("/api")

	// Public auth routes (no JWT required).
	api.POST("/auth/google", authH.Google)
	api.POST("/auth/dev-login", authH.DevLogin)
	api.POST("/auth/dev-signup", authH.DevSignup)
	api.POST("/auth/refresh", authH.Refresh)

	// Authed routes (Bearer access token required).
	authed := api.Group("")
	authed.Use(middleware.AuthRequired(jwtMgr))
	{
		// auth
		authed.POST("/auth/logout", authH.Logout)

		// me / onboarding
		authed.GET("/me", meH.Get)
		authed.POST("/me/onboarding", meH.Onboarding)
		authed.PATCH("/me/character", meH.SetCharacter)
		authed.PATCH("/me/profile", meH.SetProfile)
		authed.PATCH("/me/persona", meH.SetPersona)       // [v1.4] 구조화 페르소나 무료 편집
		authed.PATCH("/me/status", meH.SetStatusMessage)  // [v1.4] 상태 메시지(대사) 편집
		authed.PATCH("/me/stats-public", meH.SetStatsPublic) // 쇼케이스 통계 공유 토글
		authed.PATCH("/me/cosmetic", meH.SetCosmetic)     // 코스메틱 장착(보유분 중 선택/해제)
		authed.GET("/me/export", settingsH.Export)
		authed.POST("/me/reset", settingsH.Reset)

		// settings (통합 설정)
		authed.GET("/settings", settingsH.Get)
		authed.PATCH("/settings", settingsH.Patch)

		// summon (가챠·캐릭터 수집)
		authed.GET("/summon/info", summonH.Info)
		authed.GET("/summon/collection", summonH.Collection)
		authed.POST("/summon/draw", summonH.Draw)
		authed.POST("/summon/equip", summonH.Equip)
		authed.POST("/summon/tickets/buy", summonH.BuyTickets)

		// schedules
		authed.GET("/schedules", schedH.List)
		authed.POST("/schedules", schedH.Create)
		authed.PATCH("/schedules/:id", schedH.Patch)
		authed.DELETE("/schedules/:id", schedH.Delete)
		authed.POST("/schedules/:id/complete", schedH.Complete)
		authed.POST("/schedules/:id/uncomplete", schedH.Uncomplete)

		// quests
		authed.GET("/quests/today", questsH.Today)
		authed.POST("/quests/:quest_type/complete", questsH.Complete)
		authed.POST("/quests/:quest_type/claim", questsH.Claim)

		// shop
		authed.GET("/shop/items", shopH.List)
		authed.POST("/shop/purchase", shopH.Purchase)

		// titles
		authed.GET("/titles/me", titlesH.ListMine)
		authed.GET("/titles/all", titlesH.ListAll) // [v1.4] 전체 칭호(보유+잠금) + 진행도
		authed.PATCH("/titles/:id/equip", titlesH.Equip)
		authed.POST("/titles/use-defense", titlesH.UseDefense) // [v1.4] 방어권으로 페널티 복구

		// persona
		authed.POST("/persona/generate", personaH.Generate)
		authed.POST("/persona/showcase", personaH.Showcase)
		authed.POST("/persona/define", personaH.Define)

		// showcase (social)
		authed.GET("/showcase/recommendations", showcaseH.Recommendations)
		authed.GET("/showcase/:user_id", showcaseH.Get)
		authed.GET("/showcase/:user_id/series", showcaseH.Series)

		// stats
		authed.GET("/stats/grass", statsH.Grass)
		authed.GET("/stats/series", statsH.Series)
		authed.GET("/stats/summary", statsH.Summary)

		// notifications
		authed.GET("/notifications/vapid", notifH.Vapid)
		authed.POST("/notifications/subscribe", notifH.Subscribe)
	}

	return r
}
