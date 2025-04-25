package feeds

import (
	"database/sql"
	"fmt"
	"io"
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
// In production, it copies a seed database if needed.
func InitDB() error {
	var err error
	dbOnce.Do(func() {
		var dbPath string

		if os.Getenv("ENV") == "production" {
			dbPath = "/data/feeds.db"
			seedPath := "/usr/share/seed/feeds.db"

			if _, statErr := os.Stat(dbPath); os.IsNotExist(statErr) {
				input, copyErr := os.ReadFile(seedPath)
				if copyErr != nil {
					err = fmt.Errorf("failed to read seed db: %w", copyErr)
					return
				}
				if writeErr := os.WriteFile(dbPath, input, 0644); writeErr != nil {
					err = fmt.Errorf("failed to write seed db to volume: %w", writeErr)
					return
				}
				fmt.Println("🪴 Seeded /data/feeds.db with baked-in version")
			}
		} else {
			dbPath = filepath.Join("data", "feeds.db")
		}

		// 🔍 Print the DB path being used
		fmt.Printf("📂 Opening DB at: %s\n", dbPath)

		db, err = sql.Open("sqlite", dbPath)
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


func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	// Ensure target directory exists
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
