package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// AdminAuth wraps a handler with Basic Auth protection and logs failed attempts.
func AdminAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()
		clientIP := getClientIP(r)

		expectedUser := os.Getenv("ADMIN_USER")
		expectedPass := os.Getenv("ADMIN_PASS")

		if expectedUser == "" || expectedPass == "" {
			http.Error(w, "Admin credentials not configured", http.StatusInternalServerError)
			return
		}

		if !ok || username != expectedUser || password != expectedPass {
			time.Sleep(1 * time.Second) // slow brute force attacks
			w.Header().Set("WWW-Authenticate", `Basic realm="Admin Area"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		log.Printf("✅ Authorized admin: %s (%s)", username, clientIP)
		next.ServeHTTP(w, r)
	})
}

// getClientIP tries to extract the real IP from headers or remote address.
func getClientIP(r *http.Request) string {
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		parts := strings.Split(ip, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	ip := r.RemoteAddr
	if colon := strings.LastIndex(ip, ":"); colon != -1 {
		return ip[:colon]
	}
	return ip
}
