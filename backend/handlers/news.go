package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/frogfromlake/Orbitalone/backend/feeds"
	"github.com/frogfromlake/Orbitalone/backend/middleware"
	"github.com/frogfromlake/Orbitalone/backend/utils"
)

// NewsHandler handles GET requests for country-specific news articles.
// It expects a `country` query parameter (ISO Alpha-2 code) and returns a list of RSS articles in JSON format.
// If no feeds or articles are found, it returns 204 No Content.
func NewsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w, r)

	// Handle CORS preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Extract and validate the 'country' query parameter
	countryCode := strings.ToUpper(r.URL.Query().Get("country"))
	if countryCode == "" {
		http.Error(w, "Missing 'country' query parameter", http.StatusBadRequest)
		return
	}

	// Retrieve news articles for the specified country
	translateParam := r.URL.Query().Get("translate")
	shouldTranslate := translateParam == "true"

	articles, err := utils.GetNewsByCountry(countryCode, shouldTranslate)
	if err != nil {
		// Specific case: No feeds available for this country
		if errors.Is(err, feeds.ErrNoFeeds) {
			log.Printf("⚠️  No feeds for country: %s\n", countryCode)
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Generic failure
		log.Printf("❌ Failed to fetch news for %s: %v\n", countryCode, err)
		http.Error(w, "Failed to fetch news", http.StatusInternalServerError)
		return
	}

	// No articles found, respond with 204 No Content
	if len(articles) == 0 {
		log.Printf("ℹ️  No articles returned for %s\n", countryCode)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Set headers for caching and response type
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=60")

	// Encode and send article list
	if err := json.NewEncoder(w).Encode(articles); err != nil {
		log.Printf("❌ Failed to encode response for %s: %v\n", countryCode, err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}
