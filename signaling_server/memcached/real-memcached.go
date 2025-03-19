package memcached

import (
	"errors"
	"github.com/bradfitz/gomemcache/memcache"
	"net/http"
)

type RealMemcached struct {
	client *memcache.Client
	config *MemCacheConfig
}

func (m *RealMemcached) Set(token string, uuid string, expiration int32) error {
	if !m.config.ShortToken {
		return &ErrorFunctionDisabled{Message: "ShortToken is disabled"}
	}

	return m.client.Set(&memcache.Item{
		Key:        token,
		Value:      []byte(uuid),
		Expiration: expiration,
	})
}

func (m *RealMemcached) Get(token string) (string, error) {
	if !m.config.ShortToken {
		return "", &ErrorFunctionDisabled{Message: "ShortToken is disabled"}
	}

	item, err := m.client.Get(token)
	if err != nil {
		return "", err
	}
	return string(item.Value), nil
}

func (m *RealMemcached) RateLimited(ip string) bool {
	if !m.config.RateLimiting {
		return false
	}

	item, err := m.client.Decrement(ip, 1)
	// m.config.lg.WithField("item", item).Debug("Hitting rate limiter")

	if err != nil {
		if errors.Is(err, memcache.ErrCacheMiss) {
			err1 := m.client.Set(&memcache.Item{
				Key:        ip,
				Value:      []byte(m.config.MaxRequests),
				Expiration: m.config.Expiration,
			})

			if err1 != nil {
				m.config.lg.WithError(err).Error("Can't set rate limit")
			}

			return false
		}

		// If we get here we probably got rate limited, killing it just to be safe
		return true
	}

	return item == 0 // If item is 0 we are rate limited, otherwise is greater than 0 (uint64)
}

func (m *RealMemcached) GetIP(r *http.Request) string {
	return GetIp(r, m.config.CustomHeader)
}
