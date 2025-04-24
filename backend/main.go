package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/frogfromlake/Orbitalone/backend/routes"
	"github.com/joho/godotenv"
)

func main() {
	env := getEnv("ENV", "development")
	log.Printf("🌍 Environment: %s\n", env)

	// Load local .env in non-production environments
	if env != "production" {
		if err := godotenv.Load(); err != nil {
			log.Printf("⚠️  Failed to load .env: %v\n", err)
		} else {
			log.Println("✅ .env loaded")
		}
	}

	// Ensure critical credentials are set
	adminUser := os.Getenv("ADMIN_USER")
	adminPass := os.Getenv("ADMIN_PASS")
	if adminUser == "" || adminPass == "" {
		log.Fatal("❌ Missing ADMIN_USER or ADMIN_PASS in environment")
	}

	// Normalize PORT, especially for Fly.io in production
	port := getEnv("PORT", "8080")
	if env == "production" && port == "8080" {
		log.Fatal("❌ PORT must be explicitly set in production")
	}

	// Set up routes and start the server
	mux := http.NewServeMux()
	routes.Register(mux, env)

	addr := fmt.Sprintf("0.0.0.0:%s", port)
	log.Printf("✅ Server running at http://%s\n", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("❌ ListenAndServe failed: %v", err)
	}
}

// getEnv returns an environment variable or a fallback if unset.
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
