package main

import (
	log "github.com/sirupsen/logrus"
	"net/http"
	"os"

	"github.com/getsentry/sentry-go"
	"signaling_server/memcached"
)

type AppConfig struct {
	Address   string
	SentryDsn string
}

func AppConfigFromEnv() *AppConfig {
	var address string
	if address = os.Getenv("ADDRESS"); address == "" {
		address = "0.0.0.0:8080"
	}

	return &AppConfig{
		Address:   address,
		SentryDsn: os.Getenv("SENTRY_DSN"),
	}
}

func main() {
	useSentry := true

	formatter := new(log.TextFormatter)
	formatter.ForceColors = true
	formatter.ForceQuote = true
	formatter.FullTimestamp = true

	lg := &log.Logger{
		Out:       os.Stdout,
		Formatter: formatter,
		Hooks:     make(log.LevelHooks),
		Level:     log.DebugLevel,
	}

	cfg := AppConfigFromEnv()

	if err := sentry.Init(sentry.ClientOptions{
		Dsn: cfg.SentryDsn,
	}); cfg.SentryDsn == "" || err != nil {
		lg.WithError(err).Warning("Can't initialize sentry, starting without it")
		useSentry = false
	}

	memcachedCfg := memcached.NewMemCacheConfigFromEnv(lg)
	mc := memcached.NewMemcached(memcachedCfg)

	mux := http.NewServeMux()

	handlers := NewHandlers(lg, mc)
	handlers.RegisterHandlers(mux, useSentry)

	lg.Infof("Starting server on %s\n", cfg.Address)
	if err := http.ListenAndServe(cfg.Address, mux); err != nil {
		panic(err)
	}
}
