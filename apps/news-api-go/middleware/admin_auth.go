package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// AdminAuth provides HTTP Basic Auth protection for admin endpoints.
// It checks credentials against ADMIN_USER and ADMIN_PASS environment variables,
// applies a delay to deter brute-force attacks, and logs successful authentications.
func AdminAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, password, ok := r.BasicAuth()
		clientIP := getClientIP(r)

		expectedUser := os.Getenv("ADMIN_USER")
		expectedPass := os.Getenv("ADMIN_PASS")

		// Ensure credentials are configured
		if expectedUser == "" || expectedPass == "" {
			log.Printf("❌ Admin credentials not set (request from %s)", clientIP)
			http.Error(w, "Admin credentials not configured", http.StatusInternalServerError)
			return
		}

		// Reject unauthorized users with delay
		if !ok || username != expectedUser || password != expectedPass {
			time.Sleep(1 * time.Second) // deter brute-force attacks
			log.Printf("🚫 Unauthorized admin attempt from %s", clientIP)
			w.Header().Set("WWW-Authenticate", `Basic realm="Admin Area"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		log.Printf("✅ Authorized admin access by %s (%s)", username, clientIP)
		next.ServeHTTP(w, r)
	})
}

// getClientIP attempts to extract the real client IP from headers or remote address.
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
