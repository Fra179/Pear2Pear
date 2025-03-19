package main

type WSMessageType string

const (
	WSMessageTypeOffer  WSMessageType = "offer"
	WSMessageTypeAnswer WSMessageType = "answer"
	WSMessageTypeICE    WSMessageType = "candidate"
	WSMessageTypeUUID   WSMessageType = "uuid"
)

type WSMessage struct {
	Type WSMessageType `json:"type"`
	To   string        `json:"to,omitempty"`
	From string        `json:"from,omitempty"`
	Data interface{}   `json:"data,omitempty"`
}
