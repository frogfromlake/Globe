package feeds

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	_ "modernc.org/sqlite"
)

var (
	db     *sql.DB
	dbOnce sync.Once
)

// InitDB initializes the SQLite database connection.
// It creates the feeds table if it doesn't exist.
func InitDB() error {
	var err error
	dbOnce.Do(func() {
		path := filepath.Join("data", "feeds.db")
		if os.Getenv("ENV") == "production" {
			path = "/data/feeds.db"
		}

		db, err = sql.Open("sqlite", path)
		if err != nil {
			err = fmt.Errorf("failed to open database: %w", err)
			return
		}

		if err = db.Ping(); err != nil {
			err = fmt.Errorf("failed to ping database: %w", err)
			return
		}

		createTable := `
			CREATE TABLE IF NOT EXISTS feeds (
				country TEXT PRIMARY KEY,
				urls TEXT NOT NULL
			);`
		if _, err = db.Exec(createTable); err != nil {
			err = fmt.Errorf("failed to create feeds table: %w", err)
		}
	})
	return err
}
