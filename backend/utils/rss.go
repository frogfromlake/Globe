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
func GetNewsByCountry(code string, translate bool) ([]NewsArticle, error) {
	feedURLs, err := feeds.GetFeeds(code)
	if errors.Is(err, feeds.ErrNoFeeds) {
		log.Printf("🚫 No feeds found for %s", code)
		return nil, err
	}

	lang, hasMapping := IsoToDeepLLang[code]
	if !translate {
		log.Printf("🌐 Translation disabled for %s – serving original language", code)
	} else if !hasMapping {
		log.Printf("⚠️ No DeepL mapping for %s – falling back to original", code)
	}

	var all []NewsArticle
	for _, url := range feedURLs {
		if len(all) >= 10 {
			break
		}

		var articles []NewsArticle

		cacheKey := url
		if translate {
			cacheKey += "|translated"
		}

		log.Printf("🧪 Checking cache: %s (translate=%v)", cacheKey, translate)

		if cached, found := feedCache.Get(cacheKey); found {
			articles = cached.([]NewsArticle)
		} else {
			feed, err := parser.ParseURL(url)
			if err != nil {
				log.Printf("⚠️ Failed to parse %s: %v", url, err)
				continue
			}

			for _, item := range feed.Items {
				if len(articles) >= 5 || len(all)+len(articles) >= 10 {
					break
				}

				originalTitle := item.Title
				originalDesc := item.Description
				title := originalTitle
				desc := originalDesc

				if translate && hasMapping && lang != "EN" {
					log.Printf("🌍 Translating %s (%s)", originalTitle, lang)
					if translated, err := localization.TranslateText(originalTitle, lang); err == nil {
						title = translated
					}
					if originalDesc != "" {
						if translatedDesc, err := localization.TranslateText(originalDesc, lang); err == nil {
							desc = translatedDesc
						}
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
			}

			//
			feedCache.Set(cacheKey, articles, cache.DefaultExpiration)
		}

		remaining := 10 - len(all)
		if len(articles) > remaining {
			all = append(all, articles[:remaining]...)
		} else {
			all = append(all, articles...)
		}
	}

	log.Printf("📦 Total articles collected for %s: %d", code, len(all))
	return all, nil
}

// TestFeedURL returns the parsed feed data from a given URL.
func TestFeedURL(url string) (*gofeed.Feed, error) {
	return parser.ParseURL(url)
}
