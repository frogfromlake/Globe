package feeds

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sync"
)

type FeedConfig struct {
	CountryCode string   `json:"country"`
	Feeds       []string `json:"feeds"`
}

var (
	feedsFilePath = filepath.Join("data", "feeds.json")
	feedsMutex    sync.RWMutex
	feedMap       = make(map[string][]string)
)

func init() {
	if err := loadFeeds(); err != nil {
		panic("❌ Failed to load feeds: " + err.Error())
	}
}

// loadFeeds reads feeds.json and loads it into memory.
func loadFeeds() error {
	feedsMutex.Lock()
	defer feedsMutex.Unlock()

	file, err := os.ReadFile(feedsFilePath)
	if errors.Is(err, fs.ErrNotExist) {
		feedMap = make(map[string][]string)
		return nil
	} else if err != nil {
		return err
	}

	var feeds []FeedConfig
	if err := json.Unmarshal(file, &feeds); err != nil {
		return err
	}

	for _, f := range feeds {
		feedMap[f.CountryCode] = f.Feeds
	}

	return nil
}

// saveFeeds writes the in-memory feedMap back to feeds.json.
func saveFeeds() error {
	var feeds []FeedConfig
	for country, urls := range feedMap {
		feeds = append(feeds, FeedConfig{
			CountryCode: country,
			Feeds:       urls,
		})
	}

	data, err := json.MarshalIndent(feeds, "", "  ")
	if err != nil {
		log.Println("❌ JSON Marshal failed:", err)
		return err
	}

	absPath, _ := filepath.Abs(feedsFilePath)

	err = os.WriteFile(absPath, data, 0644)
	if err != nil {
		log.Println("❌ File write failed:", err)
	}
	return err
}

// GetFeeds returns feed URLs for a country.
func GetFeeds(country string) ([]string, error) {
	feedsMutex.RLock()
	defer feedsMutex.RUnlock()

	if feeds, ok := feedMap[country]; ok {
		return feeds, nil
	}
	return nil, errors.New("no feeds found")
}

// SetFeeds updates or adds feeds for a country.
func SetFeeds(country string, feedsList []string) error {
	feedsMutex.Lock()
	defer feedsMutex.Unlock()

	feedMap[country] = feedsList

	err := saveFeeds()
	if err != nil {
		log.Printf("❌ Error during saveFeeds(): %v", err)
	}
	return err
}

// ListAllFeeds returns the full feed map.
func ListAllFeeds() map[string][]string {
	feedsMutex.RLock()
	defer feedsMutex.RUnlock()

	// Return a copy to prevent external mutation
	copyMap := make(map[string][]string)
	for k, v := range feedMap {
		copyMap[k] = append([]string(nil), v...)
	}
	return copyMap
}
