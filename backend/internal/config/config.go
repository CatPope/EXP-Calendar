package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	JWTSecret            string
	JWTAccessTTLMin      int
	JWTRefreshTTLDays    int
	GoogleOAuthClientID  string
	GeminiAPIKey         string
	LLMModel             string
	OllamaBaseURL        string
	OllamaModel          string
	DevMode              bool
	AllowedOrigins       []string
	MigrationsDir        string
	VAPIDPublic          string
	VAPIDPrivate         string
	VAPIDSubject         string
}

func Load() *Config {
	// .env가 있으면 로드 (없으면 무시)
	for _, p := range []string{".env", "../.env", "../../.env"} {
		if _, err := os.Stat(p); err == nil {
			if err := godotenv.Load(p); err != nil {
				log.Printf("godotenv load %s: %v", p, err)
			}
			break
		}
	}
	return &Config{
		Port:                getenv("PORT", "8080"),
		DatabaseURL:         getenv("DATABASE_URL", "postgres://exp:exp@localhost:5432/expcalendar?sslmode=disable"),
		JWTSecret:           getenv("JWT_SECRET", "dev-secret-change-me"),
		JWTAccessTTLMin:     atoi(getenv("JWT_ACCESS_TTL_MIN", "60"), 60),
		JWTRefreshTTLDays:   atoi(getenv("JWT_REFRESH_TTL_DAYS", "14"), 14),
		GoogleOAuthClientID: getenv("GOOGLE_OAUTH_CLIENT_ID", ""),
		GeminiAPIKey:        getenv("GEMINI_API_KEY", ""),
		LLMModel:            getenv("LLM_MODEL", "gemini-2.0-flash"),
		OllamaBaseURL:       getenv("OLLAMA_BASE_URL", ""),
		OllamaModel:         getenv("OLLAMA_MODEL", "gemma4:26b"),
		DevMode:             strings.EqualFold(getenv("DEV_MODE", "true"), "true"),
		AllowedOrigins:      splitCsv(getenv("ALLOWED_ORIGINS", "http://localhost:3000")),
		MigrationsDir:       getenv("MIGRATIONS_DIR", "migrations"),
		VAPIDPublic:         getenv("VAPID_PUBLIC_KEY", ""),
		VAPIDPrivate:        getenv("VAPID_PRIVATE_KEY", ""),
		VAPIDSubject:        getenv("VAPID_SUBJECT", "mailto:admin@expcalendar.local"),
	}
}

func getenv(k, def string) string {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	return v
}

func atoi(s string, def int) int {
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}

func splitCsv(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
