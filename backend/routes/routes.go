package routes

import (
	"log"
	"net/http"

	"github.com/frogfromlake/Orbitalone/backend/handlers"
	"github.com/frogfromlake/Orbitalone/backend/middleware"
)

// Register mounts all application routes onto the provided mux.
// This includes public and admin endpoints, with environment-based toggles.
func Register(mux *http.ServeMux, env string) {
	// Public API endpoint for country-level news
	mux.Handle("/api/news", http.HandlerFunc(handlers.NewsHandler))

	// DEV-only admin tools (disabled in production)
	if env != "production" {
		log.Println("🛠️  Admin endpoints ENABLED (dev only)")

		mux.Handle("/admin/feeds", middleware.CORSHandler(
			http.HandlerFunc(handlers.AdminFeedsHandler),
		))

		mux.Handle("/admin/test-feed", middleware.CORSHandler(
			middleware.AdminAuth(http.HandlerFunc(handlers.AdminTestFeedHandler)),
		))

		mux.Handle("/admin/feeds/save", middleware.CORSHandler(
			middleware.AdminAuth(http.HandlerFunc(handlers.AdminFeedsHandler)),
		))

		mux.Handle("/admin/ping", middleware.CORSHandler(
			middleware.AdminAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"ok":true,"user":"admin"}`))
			})),
		))
	} else {
		log.Println("🚫 Admin endpoints DISABLED in production")
	}
}
