package memcached

import (
	"net/http"
)

func stripPort(ip string) string {
	for i := len(ip) - 1; i >= 0; i-- {
		if ip[i] == ':' {
			return ip[:i]
		}
	}

	return ip
}

func GetIp(r *http.Request, customHeader string) string {
	if customHeader != "" && customHeader != "REAL_IP" {
		return stripPort(r.Header.Get(customHeader))
	} else if customHeader == "REAL_IP" {
		return stripPort(r.RemoteAddr)
	}

	for _, header := range HeadersToTest {
		if ip := r.Header.Get(header); ip != "" {
			return stripPort(ip)
		}
	}

	return stripPort(r.RemoteAddr)
}
