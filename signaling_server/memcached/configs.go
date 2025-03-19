package memcached

import (
	"fmt"
	log "github.com/sirupsen/logrus"
	"os"
	"strconv"
	"strings"
)

var HeadersToTest = [...]string{
	"cf-connecting-ip",
	"x-real-ip",
	"x-forwarded-for",
}

type MemCacheConfig struct {
	UseMemcached bool
	Urls         []string

	// Rate Limiting Config
	RateLimiting bool
	MaxRequests  string
	Expiration   int32
	CustomHeader string

	// Short Token Config
	ShortToken           bool
	ShortTokenExpiration int32

	lg *log.Logger `json:"-"` // Logger
}

func (config MemCacheConfig) String() string {
	return `USE_MEMCACHED: ` + fmt.Sprint(config.UseMemcached) + "\n" +
		`MEMCACHED_URLS: ` + fmt.Sprint(config.Urls) + "\n" +
		`RATE_LIMITING: ` + fmt.Sprint(config.RateLimiting) + "\n" +
		`MAX_REQUESTS: ` + fmt.Sprint(config.MaxRequests) + "\n" +
		`EXPIRATION: ` + fmt.Sprint(config.Expiration) + "\n" +
		`CUSTOM_IP_HEADER: ` + fmt.Sprint(config.CustomHeader) + "\n" +
		`USE_SHORT_TOKEN: ` + fmt.Sprint(config.ShortToken) + "\n" +
		`SHORT_TOKEN_EXPIRATION: ` + fmt.Sprint(config.ShortTokenExpiration) + "\n"
}

func (config MemCacheConfig) Check() {
	if len(config.Urls) == 0 && config.UseMemcached {
		config.lg.Fatal("No Memcached urls provided")
	} else if !config.UseMemcached {
		config.lg.Warning("Memcached disabled")
		return // No need to check the rest
	}

	if config.RateLimiting {
		if val, err := strconv.Atoi(config.MaxRequests); err != nil || val <= 0 {
			config.lg.Info("Rate limiting enabled but max requests not set, setting it to 60")
			config.MaxRequests = "60"
		}

		if config.Expiration <= 0 {
			config.lg.Info("Rate limiting enabled but expiration not set, setting it to 30s")
			config.Expiration = 30
		}

		if config.CustomHeader == "" {
			message := strings.Builder{}
			message.WriteString("Rate limiting enabled but custom header not set. The app will use in order\n")
			for _, header := range HeadersToTest {
				message.WriteString(header + "\n")
			}
			message.WriteString("REAL_IP\n")
			config.lg.Info(message.String())
		}
	} else {
		config.lg.Warn("Rate limiting disabled")
	}

	if config.ShortToken {
		if config.ShortTokenExpiration <= 0 {
			config.lg.Info("Short token enabled but expiration not set, setting it to 30s")
			config.ShortTokenExpiration = 30
		}
	} else {
		config.lg.Warn("Short token disabled")
	}
}

func getEnvAsInt(key string, def int) int {
	val, err := strconv.Atoi(os.Getenv(key))
	if err != nil {
		return def
	}
	return val
}

func NewMemCacheConfigFromEnv(lg *log.Logger) *MemCacheConfig {
	urls := os.Getenv("MEMCACHED_URLS")

	var urlArray []string
	if urls == "" {
		urlArray = []string{}
	} else {
		urlArray = strings.Split(urls, ",")
	}

	return &MemCacheConfig{
		UseMemcached:         os.Getenv("USE_MEMCACHED") == "true",
		Urls:                 urlArray,
		RateLimiting:         os.Getenv("RATE_LIMITING") == "true",
		MaxRequests:          fmt.Sprint(getEnvAsInt("MAX_REQUESTS", 60)),
		Expiration:           int32(getEnvAsInt("EXPIRATION", 30)),
		CustomHeader:         os.Getenv("CUSTOM_IP_HEADER"),
		ShortToken:           os.Getenv("USE_SHORT_TOKEN") == "true",
		ShortTokenExpiration: int32(getEnvAsInt("SHORT_TOKEN_EXPIRATION", 60)),
		lg:                   lg,
	}
}
