## Multi-stage build for EXP Calendar backend
FROM golang:1.22-alpine AS build

WORKDIR /src
RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum* ./
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=build /out/server /app/server
COPY migrations /app/migrations

ENV PORT=8080 \
    MIGRATIONS_DIR=/app/migrations

EXPOSE 8080
CMD ["/app/server"]
