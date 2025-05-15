package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

// GetDeepLUsage handles GET /admin/deepl/usage requests.
func GetDeepLUsage(w http.ResponseWriter, r *http.Request) {
	apiKey := os.Getenv("DEEPL_API_KEY")
	if apiKey == "" {
		http.Error(w, "DeepL API key not configured", http.StatusInternalServerError)
		return
	}

	req, _ := http.NewRequest("GET", "https://api-free.deepl.com/v2/usage", nil)
	req.Header.Set("Authorization", "DeepL-Auth-Key "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch DeepL usage: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body) // directly proxy DeepL JSON body
}
