package feeds

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sync"
)

// FeedConfig represents the JSON structure used for configuring RSS feeds by country.
type FeedConfig struct {
	CountryCode string   `json:"country"`
	Feeds       []string `json:"feeds"`
}

var (
	feedsFilePath = filepath.Join("data", "feeds.json")
	feedsMutex    sync.RWMutex
	feedMap       = make(map[string][]string)
	ErrNoFeeds    = errors.New("no feeds found")
)

// init loads the feeds into memory on startup.
func init() {
	if err := loadFeeds(); err != nil {
		panic(fmt.Sprintf("❌ Failed to load feeds: %v", err))
	}
}

// loadFeeds reads feeds.json from disk and populates the in-memory feedMap.
func loadFeeds() error {
	feedsMutex.Lock()
	defer feedsMutex.Unlock()

	data, err := os.ReadFile(feedsFilePath)
	if errors.Is(err, fs.ErrNotExist) {
		feedMap = make(map[string][]string)
		return nil // Treat as empty config
	}
	if err != nil {
		return fmt.Errorf("reading feeds file failed: %w", err)
	}

	var parsed []FeedConfig
	if err := json.Unmarshal(data, &parsed); err != nil {
		return fmt.Errorf("unmarshaling feeds failed: %w", err)
	}

	for _, feed := range parsed {
		feedMap[feed.CountryCode] = feed.Feeds
	}

	return nil
}

// saveFeeds writes the in-memory feedMap to feeds.json on disk.
func saveFeeds() error {
	var all []FeedConfig
	for country, urls := range feedMap {
		all = append(all, FeedConfig{
			CountryCode: country,
			Feeds:       urls,
		})
	}

	data, err := json.MarshalIndent(all, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling feeds failed: %w", err)
	}

	absPath, _ := filepath.Abs(feedsFilePath)
	if err := os.WriteFile(absPath, data, 0644); err != nil {
		return fmt.Errorf("writing feeds file failed: %w", err)
	}

	return nil
}

// GetFeeds returns all feeds for a given country code.
func GetFeeds(country string) ([]string, error) {
	feedsMutex.RLock()
	defer feedsMutex.RUnlock()

	if feeds, ok := feedMap[country]; ok {
		return feeds, nil
	}
	return nil, fmt.Errorf("%w for country: %s", ErrNoFeeds, country)
}

// SetFeeds sets or updates the feeds for a given country.
func SetFeeds(country string, feedsList []string) error {
	feedsMutex.Lock()
	defer feedsMutex.Unlock()

	feedMap[country] = feedsList
	if err := saveFeeds(); err != nil {
		return fmt.Errorf("SetFeeds failed: %w", err)
	}

	return nil
}

// ListAllFeeds returns a deep copy of the internal feed map.
func ListAllFeeds() map[string][]string {
	feedsMutex.RLock()
	defer feedsMutex.RUnlock()

	copyMap := make(map[string][]string, len(feedMap))
	for country, urls := range feedMap {
		copyMap[country] = append([]string(nil), urls...)
	}
	return copyMap
}
