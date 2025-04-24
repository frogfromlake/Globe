package main

import (
	"log"
	"net/http"
	"os"

	"github.com/frogfromlake/Orbitalone/backend/handlers"
	"github.com/frogfromlake/Orbitalone/backend/middleware"
	"github.com/joho/godotenv"
)

func main() {
	// Normalize ENV
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
		log.Println("🌍 Environment: Dev (default)")
	} else {
		log.Println("🌍 Environment:", env)
	}

	// Load .env only in development
	if env != "production" {
		if err := godotenv.Load(); err != nil {
			log.Println("⚠️ Could not load .env file")
		} else {
			log.Println("✅ .env loaded")
		}
	}

	adminUser := os.Getenv("ADMIN_USER")
	adminPass := os.Getenv("ADMIN_PASS")

	if adminUser == "" || adminPass == "" {
		log.Fatal("❌ ADMIN_USER or ADMIN_PASS is not set in environment")
	}

	port := os.Getenv("PORT")
	if env == "production" && port == "" {
		log.Fatal("❌ PORT must be set in production (Fly.io sets this automatically)")
	}
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// Public API route
	mux.Handle("/api/news", http.HandlerFunc(handlers.NewsHandler))

	// Dev-only admin routes
	if env != "production" {
		log.Println("🛠️  Admin endpoints enabled (DEV only)")

		mux.Handle("/admin/feeds", middleware.CORSHandler(http.HandlerFunc(handlers.AdminFeedsHandler)))
		mux.Handle("/admin/test-feed", middleware.CORSHandler(middleware.AdminAuth(http.HandlerFunc(handlers.AdminTestFeedHandler))))
		mux.Handle("/admin/feeds/save", middleware.CORSHandler(middleware.AdminAuth(http.HandlerFunc(handlers.AdminFeedsHandler))))
		mux.Handle("/admin/ping", middleware.CORSHandler(
			middleware.AdminAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.Write([]byte(`{"ok":true,"user":"admin"}`))
			})),
		))
	} else {
		log.Println("🚫 Admin endpoints are DISABLED in production")
	}

	log.Printf("✅ Server running on http://0.0.0.0:%s\n", port)
	if err := http.ListenAndServe("0.0.0.0:"+port, mux); err != nil {
		log.Fatal(err)
	}
}
