package main

import (
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/gorilla/websocket"
	log "github.com/sirupsen/logrus"
	"net/http"
	"signaling_server/memcached"
)

type Handlers struct {
	dispatcher *Dispatcher
	upgrader   websocket.Upgrader
	mc         memcached.Memcached
	lg         *log.Logger
}

func NewHandlers(logger *log.Logger, mc memcached.Memcached) *Handlers {
	return &Handlers{
		NewDispatcher(),
		websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
		mc,
		logger,
	}
}

func (h *Handlers) WSHandler(w http.ResponseWriter, r *http.Request) {
	addr := h.mc.GetIP(r)
	if h.mc.RateLimited(addr) {
		http.Error(w, "Rate limited", http.StatusTooManyRequests)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)

	if err != nil {
		log.Println("Got error upgrading connection:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	uid, err := h.dispatcher.Register(conn)

	if err != nil {
		log.Println("Got error registering connection:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	wsConn := NewWSConn(
		uid,
		conn,
		addr,
		h.mc,
		h.dispatcher,
		h.lg,
	)

	if err = wsConn.SendWelcomeMessage(); err != nil {
		log.Println("Got error sending welcome message:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	go wsConn.ReadRoutine()
}

func (h *Handlers) RegisterHandlers(mux *http.ServeMux, useSentry bool) {
	if useSentry {
		sentryHandler := sentryhttp.New(sentryhttp.Options{})
		mux.HandleFunc("/ws", sentryHandler.HandleFunc(h.WSHandler))
	} else {
		mux.HandleFunc("/ws", h.WSHandler)
	}
}
