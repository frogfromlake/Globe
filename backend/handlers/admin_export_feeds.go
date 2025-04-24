package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/frogfromlake/Orbitalone/backend/feeds"
)

// AdminExportFeedsHandler returns all configured feeds as JSON backup.
func AdminExportFeedsHandler(w http.ResponseWriter, r *http.Request) {
	data := feeds.ListAllFeeds()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
