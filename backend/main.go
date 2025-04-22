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

	log.Printf("✅ Server running on http://0.0.0.0:%s\n", port)
	err := http.ListenAndServe("0.0.0.0:"+port, mux)
	if err != nil {
		log.Fatal(err)
	}
}
