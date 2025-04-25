package utils

import (
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/frogfromlake/Orbitalone/backend/feeds"
	"github.com/frogfromlake/Orbitalone/backend/localization"

	"github.com/mmcdole/gofeed"
	"github.com/patrickmn/go-cache"
)

// Article cache
var feedCache = cache.New(30*time.Minute, 10*time.Minute)

// Transport with user-agent
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
	Title               string `json:"title"`
	OriginalTitle       string `json:"originalTitle,omitempty"`
	Link                string `json:"link"`
	Description         string `json:"description,omitempty"`
	OriginalDescription string `json:"originalDescription,omitempty"`
	Published           string `json:"published,omitempty"`
	Source              string `json:"source"`
}

// GetNewsByCountry fetches RSS feeds for a country and optionally translates them.
func GetNewsByCountry(code string) ([]NewsArticle, error) {
	feedURLs, err := feeds.GetFeeds(code)
	if errors.Is(err, feeds.ErrNoFeeds) {
		log.Printf("🚫 No feeds found for %s", code)
		return nil, err
	}

	lang, shouldTranslate := IsoToDeepLLang[code]
	if !shouldTranslate {
		log.Printf("⚠️ No DeepL mapping for %s – will serve original language only", code)
	}

	var all []NewsArticle
	for _, url := range feedURLs {
		if cached, found := feedCache.Get(url); found {
			all = append(all, cached.([]NewsArticle)...)
			continue
		}

		feed, err := parser.ParseURL(url)
		if err != nil {
			log.Printf("⚠️ Failed to parse %s: %v", url, err)
			continue
		}

		var articles []NewsArticle
		for _, item := range feed.Items {
			originalTitle := item.Title
			originalDesc := item.Description

			title := originalTitle
			desc := originalDesc

			if shouldTranslate && lang != "EN" {
				if translated, err := localization.TranslateText(originalTitle, lang); err == nil {
					title = translated
				} else {
					log.Printf("⚠️ Failed to translate title: %s (%s) – %v", originalTitle, lang, err)
				}

				if originalDesc != "" {
					if translatedDesc, err := localization.TranslateText(originalDesc, lang); err == nil {
						desc = translatedDesc
					} else {
						log.Printf("⚠️ Failed to translate description for: %s (%s) – %v", originalTitle, lang, err)
					}
				}
			} else if !shouldTranslate {
				if originalDesc != "" {
					desc = originalDesc + " (Only in local language)"
				}
			}

			articles = append(articles, NewsArticle{
				Title:               title,
				OriginalTitle:       originalTitle,
				Link:                item.Link,
				Description:         desc,
				OriginalDescription: originalDesc,
				Published:           item.Published,
				Source:              feed.Title,
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

// TestFeedURL returns the parsed feed data from a given URL.
func TestFeedURL(url string) (*gofeed.Feed, error) {
	return parser.ParseURL(url)
}
