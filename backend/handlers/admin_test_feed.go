package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/frogfromlake/Orbitalone/backend/middleware"
	"github.com/frogfromlake/Orbitalone/backend/utils"
)

// AdminTestFeedHandler validates a feed URL by attempting to fetch and parse it.
// Returns basic metadata and article count. Requires ?url= query param.
func AdminTestFeedHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w, r)

	// Extract and validate the feed URL
	url := r.URL.Query().Get("url")
	if url == "" {
		http.Error(w, "Missing ?url parameter", http.StatusBadRequest)
		return
	}

	// Try to fetch and parse the RSS feed
	feed, err := utils.TestFeedURL(url)
	if err != nil {
		log.Printf("❌ Failed to test feed URL (%s): %v", url, err)
		http.Error(w, "Failed to fetch or parse feed: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Prepare response payload
	resp := map[string]interface{}{
		"valid":    true,
		"source":   feed.Title,
		"articles": len(feed.Items),
	}
	if len(feed.Items) > 0 {
		resp["firstItemTitle"] = feed.Items[0].Title
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("❌ Failed to encode test feed response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
