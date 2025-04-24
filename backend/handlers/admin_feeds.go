package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/frogfromlake/Orbitalone/backend/feeds"
	"github.com/frogfromlake/Orbitalone/backend/middleware"
)

// AdminFeedsHandler handles GET and POST requests to list or update feed configurations.
// Requires admin authentication and handles CORS internally.
func AdminFeedsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w, r)

	switch r.Method {
	case http.MethodGet:
		handleListFeeds(w)
	case http.MethodPost:
		handleSetFeeds(w, r)
	case http.MethodDelete:
		handleDeleteFeeds(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleListFeeds responds with the full list of country feed configurations in JSON format.
func handleListFeeds(w http.ResponseWriter) {
	allFeeds := feeds.ListAllFeeds()

	response := make([]feeds.FeedConfig, 0, len(allFeeds))
	for country, urls := range allFeeds {
		response = append(response, feeds.FeedConfig{
			CountryCode: country,
			Feeds:       urls,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("❌ Failed to encode feed list: %v", err)
		http.Error(w, "Failed to encode feed list", http.StatusInternalServerError)
	}
}

// handleSetFeeds decodes a FeedConfig from the request body and saves it to the feeds store.
// Returns a confirmation payload on success or an error on failure.
func handleSetFeeds(w http.ResponseWriter, r *http.Request) {
	var payload feeds.FeedConfig

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Printf("❌ Failed to decode JSON body: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if payload.CountryCode == "" || len(payload.Feeds) == 0 {
		log.Println("❌ Missing country code or feed list in payload")
		http.Error(w, "Missing country or feeds", http.StatusBadRequest)
		return
	}

	if err := feeds.SetFeeds(payload.CountryCode, payload.Feeds); err != nil {
		log.Printf("❌ Failed to save feeds for %s: %v", payload.CountryCode, err)
		http.Error(w, "Failed to save feeds", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{
		"status":  "ok",
		"country": payload.CountryCode,
		"feeds":   payload.Feeds,
	}); err != nil {
		log.Printf("❌ Failed to encode success response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// handleDeleteFeeds deletes the feeds for a given country.
// It responds with a confirmation payload or an error.
func handleDeleteFeeds(w http.ResponseWriter, r *http.Request) {
	country := r.URL.Query().Get("country")
	if country == "" {
		http.Error(w, "Missing country code", http.StatusBadRequest)
		return
	}

	if err := feeds.DeleteFeeds(country); err != nil {
		log.Printf("❌ Failed to delete feeds for %s: %v", country, err)
		http.Error(w, "Failed to delete feeds", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
