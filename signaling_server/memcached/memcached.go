package memcached

import (
	"github.com/bradfitz/gomemcache/memcache"
	"net/http"
)

type Memcached interface {
	Set(token string, uuid string, expiration int32) error
	Get(token string) (string, error)
	RateLimited(ip string) bool
	GetIP(r *http.Request) string
}

func NewMemcached(config *MemCacheConfig) Memcached {
	config.Check()

	// let's print the config
	config.lg.Info(config.String())

	if !config.UseMemcached {
		return &FakeMemcached{}
	}

	return &RealMemcached{
		memcache.New(config.Urls...),
		config,
	}
}
