package middleware

import (
	"net/http"
	"os"
)

// CORSHandler wraps an HTTP handler with CORS headers and preflight handling.
// This is typically applied to routes that are called from cross-origin frontends.
func CORSHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w, r)

		// Handle CORS preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Proceed to the next handler
		h.ServeHTTP(w, r)
	})
}

// SetCORSHeaders allows manually setting CORS headers on a response.
// This is used inside handlers that need to handle CORS themselves.
func SetCORSHeaders(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
}

// setCORSHeaders sets the appropriate Access-Control headers for CORS requests.
func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	env := os.Getenv("ENV")
	origin := r.Header.Get("Origin")

	// List of explicitly allowed origins in production
	allowedOrigins := map[string]bool{
		"https://orbitalone.space":               true,
		"https://orbitalone-frontend.vercel.app": true,
	}

	if env == "production" {
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
	} else if origin != "" {
		// Reflect origin during development
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}

	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
}
