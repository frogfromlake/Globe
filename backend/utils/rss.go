package utils

import (
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/frogfromlake/Orbitalone/backend/feeds"
	"github.com/mmcdole/gofeed"
	"github.com/patrickmn/go-cache"
)

var feedCache = cache.New(30*time.Minute, 10*time.Minute)

// Transport that forces a User-Agent
type userAgentTransport struct {
	originalTransport http.RoundTripper
}

func (t *userAgentTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; OrbitalOneBot/1.0; +https://orbitalone.space)")
	return t.originalTransport.RoundTrip(req)
}

var parser = &gofeed.Parser{
	Client: &http.Client{
		Timeout: 10 * time.Second,
		Transport: &userAgentTransport{
			originalTransport: http.DefaultTransport,
		},
	},
}

type NewsArticle struct {
	Title       string `json:"title"`
	Link        string `json:"link"`
	Description string `json:"description,omitempty"`
	Published   string `json:"published,omitempty"`
	Source      string `json:"source"`
}

func GetNewsByCountry(code string) ([]NewsArticle, error) {
	feedURLs, err := feeds.GetFeeds(code)
	if errors.Is(err, feeds.ErrNoFeeds) {
		log.Printf("🚫 No feeds found for %s", code)
		return nil, err
	}

	var all []NewsArticle

	for _, url := range feedURLs {
		if cached, found := feedCache.Get(url); found {
			all = append(all, cached.([]NewsArticle)...)
			continue
		}

		feed, err := parser.ParseURL(url)

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

		feedCache.Set(url, articles, cache.DefaultExpiration)
		all = append(all, articles...)
	}

	log.Printf("📦 Total articles collected for %s: %d", code, len(all))
	return all, nil
}

func TestFeedURL(url string) (*gofeed.Feed, error) {
	return parser.ParseURL(url)
}
