package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/frogfromlake/Orbitalone/backend/middleware"
	"github.com/frogfromlake/Orbitalone/backend/utils"
)

func AdminTestFeedHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w, r)

	url := r.URL.Query().Get("url")
	if url == "" {
		http.Error(w, "Missing ?url parameter", http.StatusBadRequest)
		return
	}

	feed, err := utils.TestFeedURL(url)
	if err != nil {
		http.Error(w, "Failed to fetch or parse feed: "+err.Error(), http.StatusBadRequest)
		return
	}

	resp := map[string]interface{}{
		"valid":    true,
		"source":   feed.Title,
		"articles": len(feed.Items),
	}

	if len(feed.Items) > 0 {
		resp["firstItemTitle"] = feed.Items[0].Title
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
