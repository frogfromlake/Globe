// backend/utils/rss.go
package utils

import (
	"encoding/json"
	"errors"
	"log"
	"os"
	"time"

	"github.com/mmcdole/gofeed"
	"github.com/patrickmn/go-cache"
)

var (
	feedCache    = cache.New(30*time.Minute, 10*time.Minute)
	countryFeeds map[string][]string
)

type NewsArticle struct {
	Title       string `json:"title"`
	Link        string `json:"link"`
	Description string `json:"description,omitempty"`
	Published   string `json:"published,omitempty"`
	Source      string `json:"source"`
}

func init() {
	file, err := os.ReadFile("feeds/countryToFeeds.json")
	if err != nil {
		panic("Could not load countryToFeeds.json: " + err.Error())
	}

	err = json.Unmarshal(file, &countryFeeds)
	if err != nil {
		panic("Invalid JSON in countryToFeeds.json: " + err.Error())
	}

	log.Printf("✅ Loaded feeds for %d countries", len(countryFeeds))
}

func GetNewsByCountry(code string) ([]NewsArticle, error) {
	feeds, ok := countryFeeds[code]
	if !ok {
		log.Printf("🚫 No feeds found for %s", code)
		return nil, errors.New("No feeds found for country " + code)
	}

	log.Printf("🔍 Fetching news for %s from %d feeds", code, len(feeds))
	var all []NewsArticle

	for _, url := range feeds {
		log.Printf("🌐 Trying feed URL: %s", url)

		if cached, found := feedCache.Get(url); found {
			log.Printf("✅ Using cached feed: %s", url)
			all = append(all, cached.([]NewsArticle)...)
			continue
		}

		fp := gofeed.NewParser()
		feed, err := fp.ParseURL(url)
		if err != nil {
			log.Printf("⚠️ Failed to fetch/parse %s: %v", url, err)
			continue
		}

		var articles []NewsArticle
		for _, item := range feed.Items {
			articles = append(articles, NewsArticle{
				Title:       item.Title,
				Link:        item.Link,
				Description: item.Description,
				Published:   item.Published,
				Source:      feed.Title,
			})
			if len(articles) >= 5 {
				break
			}
		}

		log.Printf("📰 Found %d articles from %s", len(articles), feed.Title)

		feedCache.Set(url, articles, cache.DefaultExpiration)
		all = append(all, articles...)
	}

	log.Printf("📦 Total articles collected for %s: %d", code, len(all))
	return all, nil
}
