package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/frogfromlake/Orbitalone/backend/feeds"
	"github.com/frogfromlake/Orbitalone/backend/middleware"
)

func AdminFeedsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w, r)

	switch r.Method {
	case http.MethodGet:
		handleListFeeds(w)
	case http.MethodPost:
		handleSetFeeds(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleListFeeds(w http.ResponseWriter) {
	allFeeds := feeds.ListAllFeeds()

	var response []feeds.FeedConfig
	for country, urls := range allFeeds {
		response = append(response, feeds.FeedConfig{
			CountryCode: country,
			Feeds:       urls,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleSetFeeds(w http.ResponseWriter, r *http.Request) {
	var payload feeds.FeedConfig
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Println("❌ Failed to decode JSON:", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if payload.CountryCode == "" || len(payload.Feeds) == 0 {
		log.Println("❌ Missing country or feeds")
		http.Error(w, "Missing country or feeds", http.StatusBadRequest)
		return
	}

	if err := feeds.SetFeeds(payload.CountryCode, payload.Feeds); err != nil {
		log.Printf("❌ Failed to save feeds: %v", err)
		http.Error(w, "Failed to save feeds", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":  "ok",
		"country": payload.CountryCode,
		"feeds":   payload.Feeds,
	})

}
