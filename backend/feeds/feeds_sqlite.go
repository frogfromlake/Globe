package feeds

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
)

// FeedConfig represents the JSON structure used for configuring RSS feeds by country.
type FeedConfig struct {
	CountryCode string   `json:"country"`
	Feeds       []string `json:"feeds"`
}

// ErrNoFeeds is returned when no feeds are found for a country.
var ErrNoFeeds = errors.New("no feeds found")

// GetFeeds returns all feeds for a given country code.
func GetFeeds(country string) ([]string, error) {
	row := db.QueryRow(`SELECT urls FROM feeds WHERE country = ?`, country)

	var jsonData string
	if err := row.Scan(&jsonData); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w for country: %s", ErrNoFeeds, country)
		}
		return nil, fmt.Errorf("query error: %w", err)
	}

	var urls []string
	if err := json.Unmarshal([]byte(jsonData), &urls); err != nil {
		return nil, fmt.Errorf("failed to parse feed list: %w", err)
	}
	return urls, nil
}

// SetFeeds inserts or updates the feeds for a given country.
func SetFeeds(country string, feedsList []string) error {
	jsonData, err := json.Marshal(feedsList)
	if err != nil {
		return fmt.Errorf("failed to marshal feed list: %w", err)
	}

	_, err = db.Exec(`
		INSERT INTO feeds (country, urls)
		VALUES (?, ?)
		ON CONFLICT(country) DO UPDATE SET urls = excluded.urls
	`, country, string(jsonData))

	if err != nil {
		return fmt.Errorf("failed to save feeds: %w", err)
	}
	return nil
}

// ListAllFeeds returns a deep copy of all feeds in the database.
func ListAllFeeds() map[string][]string {
	rows, err := db.Query(`SELECT country, urls FROM feeds`)
	if err != nil {
		fmt.Printf("❌ Failed to query feeds: %v\n", err)
		return nil
	}
	defer rows.Close()

	result := make(map[string][]string)
	for rows.Next() {
		var country, jsonData string
		if err := rows.Scan(&country, &jsonData); err != nil {
			continue
		}
		var urls []string
		if err := json.Unmarshal([]byte(jsonData), &urls); err != nil {
			continue
		}
		result[country] = urls
	}
	return result
}

// DeleteFeeds removes all feeds for a given country code.
func DeleteFeeds(country string) error {
	_, err := db.Exec(`DELETE FROM feeds WHERE country = ?`, country)
	if err != nil {
		return fmt.Errorf("failed to delete feeds for %s: %w", country, err)
	}
	return nil
}

