package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/frogfromlake/Orbitalone/backend/utils"
)

func NewsHandler(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "http://localhost:5173" || origin == "https://orbitalone.space" || origin == "https://orbitalone-frontend.vercel.app" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		// Preflight request — return with headers only
		w.WriteHeader(http.StatusNoContent)
		return
	}

	countryCode := r.URL.Query().Get("country")
	countryCode = strings.ToUpper(countryCode)

	if countryCode == "" {
		http.Error(w, "Missing country code", http.StatusBadRequest)
		return
	}

	articles, err := utils.GetNewsByCountry(countryCode)
	if err != nil {
		log.Printf("Error fetching news for %s: %v\n", countryCode, err)

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
