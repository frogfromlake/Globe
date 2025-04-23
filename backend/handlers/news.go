package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/frogfromlake/Orbitalone/backend/middleware"
	"github.com/frogfromlake/Orbitalone/backend/utils"
)

func NewsHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w, r)

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// === YOUR HANDLER LOGIC ===
	countryCode := strings.ToUpper(r.URL.Query().Get("country"))
	if countryCode == "" {
		http.Error(w, "Missing country code", http.StatusBadRequest)
		return
	}

	articles, err := utils.GetNewsByCountry(countryCode)
	if err != nil {
		log.Printf("❌ Error fetching news for %s: %v\n", countryCode, err)
		if strings.Contains(err.Error(), "No feeds found") {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		http.Error(w, "Failed to fetch news", http.StatusInternalServerError)
		return
	}

	if len(articles) == 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(articles)
}
