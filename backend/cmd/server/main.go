// Package main is the EXP Calendar HTTP server entry point.
//
// Boot sequence:
//  1. Load config from env (.env via godotenv if present).
//  2. Open pgxpool to DATABASE_URL.
//  3. Apply migrations from MIGRATIONS_DIR in lexical order (idempotent;
//     applied filenames are recorded in schema_migrations).
//  4. Build the gin router (server.NewRouter wires every domain handler).
//  5. Serve HTTP on :PORT with graceful shutdown on SIGINT/SIGTERM.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/expcalendar/backend/internal/config"
	"github.com/expcalendar/backend/internal/db"
	"github.com/expcalendar/backend/internal/server"
	"github.com/expcalendar/backend/internal/worker"
)

func main() {
	cfg := config.Load()

	startupCtx, cancelStartup := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelStartup()

	pool, err := db.Connect(startupCtx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()
	log.Printf("db connected")

	if err := db.Migrate(startupCtx, pool, cfg.MigrationsDir); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	log.Printf("migrations applied from %s", cfg.MigrationsDir)

	// VAPID keys for Web Push (FR-NOTI-01). Use env keys if provided; otherwise
	// generate an ephemeral pair so push works out-of-the-box in dev (browsers
	// re-subscribe on reload). Set VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY to persist.
	if cfg.VAPIDPublic == "" || cfg.VAPIDPrivate == "" {
		if priv, pub, gerr := webpush.GenerateVAPIDKeys(); gerr == nil {
			cfg.VAPIDPrivate, cfg.VAPIDPublic = priv, pub
			log.Printf("generated ephemeral VAPID keys (set VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY to persist)")
		} else {
			log.Printf("VAPID key generation failed (%v) — web push disabled", gerr)
		}
	}

	router := server.NewRouter(cfg, pool)

	// Background worker: schedule reminders (FR-NOTI-02) + OVERDUE sweep/penalty
	// (FR-TITLE-03). Sends real Web Push when VAPID keys are available.
	workerCtx, cancelWorker := context.WithCancel(context.Background())
	defer cancelWorker()
	var notifier worker.Notifier
	if cfg.VAPIDPublic != "" && cfg.VAPIDPrivate != "" {
		notifier = worker.NewWebPushNotifier(cfg.VAPIDPublic, cfg.VAPIDPrivate, cfg.VAPIDSubject, pool)
		log.Printf("web push enabled (VAPID)")
	} else {
		notifier = worker.LogNotifier{Enabled: true}
	}
	worker.New(pool, notifier).Start(workerCtx)
	log.Printf("background worker started (reminders + overdue sweep)")

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serverErrs := make(chan error, 1)
	go func() {
		log.Printf("listening on %s (dev_mode=%v)", srv.Addr, cfg.DevMode)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrs <- err
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-quit:
		log.Printf("received signal %s, shutting down", sig)
	case err := <-serverErrs:
		log.Printf("server error: %v", err)
	}

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelShutdown()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	} else {
		log.Printf("graceful shutdown complete")
	}
}
