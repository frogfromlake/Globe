// backend/main.go
package main

import (
	"log"
	"net/http"

	"github.com/frogfromlake/globe-news-backend/handlers"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/news", handlers.NewsHandler)

	log.Println("✅ Server running on http://localhost:8080")
	err := http.ListenAndServe(":8080", mux)
	if err != nil {
		log.Fatal(err)
	}
}
