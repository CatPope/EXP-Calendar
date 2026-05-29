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

	"github.com/expcalendar/backend/internal/config"
	"github.com/expcalendar/backend/internal/db"
	"github.com/expcalendar/backend/internal/server"
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

	router := server.NewRouter(cfg, pool)

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
