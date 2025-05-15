package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/frogfromlake/Orbitalone/apps/news-api-go/feeds"
	"github.com/frogfromlake/Orbitalone/apps/news-api-go/middleware"
)

// AdminImportFeedsHandler handles importing a batch of feeds into the database.
// It expects a JSON array of FeedConfig objects and requires admin authentication.
func AdminImportFeedsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w, r)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var input []feeds.FeedConfig
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Printf("❌ Failed to parse import body: %v\n", err)
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	imported := 0
	for _, cfg := range input {
		if cfg.CountryCode == "" || len(cfg.Feeds) == 0 {
			log.Printf("⚠️ Skipped invalid entry: %+v\n", cfg)
			continue
		}
		if err := feeds.SetFeeds(cfg.CountryCode, cfg.Feeds); err != nil {
			log.Printf("⚠️ Failed to save feeds for %s: %v\n", cfg.CountryCode, err)
			continue
		}
		imported++
	}

	log.Printf("✅ Imported %d feed entries from admin panel\n", imported)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":   "ok",
		"imported": imported,
	})
}
