FROM golang:1.24-bookworm as builder

WORKDIR /usr/src/app
COPY go.mod go.sum ./
RUN go mod download && go mod verify
COPY . .
RUN go build -v -o /run-app .

FROM debian:bookworm
WORKDIR /usr/src/app

# Install CA certificates
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /run-app /usr/local/bin/
COPY data/feeds.db /data/feeds.db
CMD ["run-app"]
