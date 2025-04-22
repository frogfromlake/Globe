package main

import (
	"log"
	"net/http"
	"os"

	"github.com/frogfromlake/Orbitalone/backend/handlers"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // fallback for local dev
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/news", handlers.NewsHandler)

	log.Printf("✅ Server running on http://localhost:%s\n", port)
	err := http.ListenAndServe(":"+port, mux)
	if err != nil {
		log.Fatal(err)
	}
}
