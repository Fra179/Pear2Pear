package main

import (
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"sync"
)

type Dispatcher struct {
	mu          sync.RWMutex
	connections map[string]*websocket.Conn
}

func NewDispatcher() *Dispatcher {
	return &Dispatcher{sync.RWMutex{}, make(map[string]*websocket.Conn)}
}

func (d *Dispatcher) Register(conn *websocket.Conn) (string, error) {
	uid := uuid.New()

	d.mu.RLock()
	for retries := 0; d.connections[uid.String()] != nil; retries++ {
		if retries > 10 {
			d.mu.RUnlock()
			return "", errors.New("could not generate unique ID")
		}
		uid = uuid.New()
	}
	d.mu.RUnlock()

	d.mu.Lock()
	d.connections[uid.String()] = conn
	d.mu.Unlock()

	return uid.String(), nil
}

func (d *Dispatcher) Unregister(uid string) {
	d.mu.Lock()
	delete(d.connections, uid)
	d.mu.Unlock()
}

func (d *Dispatcher) Forward(uuid string, msg interface{}) error {
	if uuid == "" {
		return errors.New("empty UUID")
	}
	
	bytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	d.mu.RLock()
	conn, ok := d.connections[uuid]
	d.mu.RUnlock()
	if !ok {
		return errors.New("connection not found")
	}
	return conn.WriteMessage(websocket.TextMessage, bytes)
}
