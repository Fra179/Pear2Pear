FROM golang:alpine3.21 as builder

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o signaling_server .

FROM alpine:3.21

WORKDIR /home

COPY --from=builder /go/signaling_server signaling_server
RUN chmod +x signaling_server

LABEL org.opencontainers.image.description="Custom signaling server for a Peer-to-Peer WebRTC file-sharing application"

ENV PORT=8080
ENV ADDRESS="0.0.0.0:$PORT"
EXPOSE $PORT

CMD ["./signaling_server"]