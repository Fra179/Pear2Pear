package memcached

import "net/http"

type FakeMemcached struct {
}

func (m *FakeMemcached) Set(_ string, _ string, _ int32) error {
	return &ErrorFunctionDisabled{Message: "ShortToken is disabled"}
}

func (m *FakeMemcached) Get(_ string) (string, error) {
	return "", &ErrorFunctionDisabled{Message: "ShortToken is disabled"}
}

func (m *FakeMemcached) RateLimited(_ string) bool {
	return false
}

func (m *FakeMemcached) GetIP(r *http.Request) string {
	// WARNING: This is a fake implementation, as the result of this function is not actually needed. But it may cause issues
	// if the real implementation is needed in the future.
	// TODO: Eventually implement it, or consider having GetIP as a separate function (suggested).
	return ""
}
