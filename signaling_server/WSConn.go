package main

import (
	"bytes"
	"encoding/json"
	"github.com/gorilla/websocket"
	log "github.com/sirupsen/logrus"
	"signaling_server/memcached"
)

var RateLimitedMessage, _ = websocket.NewPreparedMessage(
	websocket.TextMessage,
	[]byte("Rate limited"),
)

type WSConn struct {
	uid  string
	conn *websocket.Conn
	addr string

	mc memcached.Memcached

	d *Dispatcher

	_lg     *log.Logger
	_fields log.Fields
}

func NewWSConn(uid string, conn *websocket.Conn, address string, mcached memcached.Memcached, dispatcher *Dispatcher, logger *log.Logger) *WSConn {
	return &WSConn{
		uid,
		conn,
		address,
		mcached,
		dispatcher,
		logger,
		log.Fields{
			"UUID": uid,
			"addr": address,
		},
	}
}

func (w *WSConn) logger(msg interface{}) *log.Entry {
	if msg != nil {
		return w._lg.WithFields(w._fields).WithField("msg", msg)
	}
	return w._lg.WithFields(w._fields)
}

func (w *WSConn) HandleTextMessage(payload []byte) error {
	if w.mc.RateLimited(w.addr) {
		defer func() { _ = w.HandleCloseMessage() }()
		return w.conn.WritePreparedMessage(RateLimitedMessage)
	}

	msg := new(WSMessage)
	err := json.NewDecoder(bytes.NewBuffer(payload)).Decode(msg)
	msg.From = w.uid

	if err != nil {
		return err
	}

	switch msg.Type {
	case WSMessageTypeOffer, WSMessageTypeAnswer, WSMessageTypeICE:
		err = w.d.Forward(msg.To, msg)
		if err != nil {
			w.logger(msg).WithError(err).Debug("Error while forwarding message")
		}
		break
	default:
		return nil
	}

	return err
}

func (w *WSConn) HandleBinaryMessage(_ []byte) {
	_ = w.HandleCloseMessage()
}

func (w *WSConn) SendWelcomeMessage() error {
	msg := WSMessage{WSMessageTypeUUID, "", w.uid, w.uid}
	msgBytes, err := json.Marshal(msg)

	if err != nil {
		return err
	}

	return w.conn.WriteMessage(websocket.TextMessage, msgBytes)
}

func (w *WSConn) HandleCloseMessage() error {
	w.d.Unregister(w.uid)
	return w.conn.Close()
}

func (w *WSConn) HandePingMessage() {
	// _ = w.conn.WriteMessage(websocket.PingMessage, nil)
}

func (w *WSConn) ReadRoutine() {
	for {
		msgType, payload, err := w.conn.ReadMessage()

		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNoStatusReceived) {
				w.logger(nil).Warnf("Websocket with id %s closed unexpectedly\n", w.uid)
			}
			_ = w.HandleCloseMessage()
			return
		}

		switch msgType {
		case websocket.TextMessage:
			err = w.HandleTextMessage(payload)
			if err != nil {
				w.logger(string(payload)).WithError(err).Debug("Error handling text message, closing connection")
				_ = w.HandleCloseMessage()
			}
			break
		case websocket.BinaryMessage:
			w.HandleBinaryMessage(payload)
			return
		case websocket.CloseMessage:
			_ = w.HandleCloseMessage()
			return
		}
	}
}

func (w *WSConn) Start() {
	go w.ReadRoutine()
}
