package memcached

type ErrorFunctionDisabled struct {
	Message string
}

func (e *ErrorFunctionDisabled) Error() string {
	return e.Message
}
