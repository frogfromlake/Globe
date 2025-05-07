package utils

import (
	"errors"
	"log"
	"net/http"
	"sync"
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

// Temporary blacklist for feeds that failed recently
var failedFeeds = cache.New(30*time.Minute, 10*time.Minute)

// Prevents stampede on cache miss by locking per-feed URL
var fetchLocks sync.Map // map[string]*sync.Mutex

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

	var (
		mu        sync.Mutex
		wg        sync.WaitGroup
		all       []NewsArticle
		semaphore = make(chan struct{}, 4) // max 4 concurrent fetches
		limit     = 10
	)

	for _, url := range feedURLs {
		wg.Add(1)
		go func(url string) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			if _, blacklisted := failedFeeds.Get(url); blacklisted {
				log.Printf("🚫 Skipping blacklisted feed: %s", url)
				return
			}

			cacheKey := url
			if translate {
				cacheKey += "|translated"
			}

			var articles []NewsArticle
			if cached, found := feedCache.Get(cacheKey); found {
				articles = cached.([]NewsArticle)
			} else {
				// Prevent cache stampede
				lockRaw, _ := fetchLocks.LoadOrStore(cacheKey, &sync.Mutex{})
				lock := lockRaw.(*sync.Mutex)

				lock.Lock()
				defer lock.Unlock()

				// Re-check cache inside the lock (double-check)
				if cached, found := feedCache.Get(cacheKey); found {
					articles = cached.([]NewsArticle)
				} else {
					start := time.Now()
					feed, err := parser.ParseURL(url)
					if err != nil {
						log.Printf("⚠️ Failed to parse %s: %v", url, err)
						failedFeeds.Set(url, true, cache.DefaultExpiration)
						return
					}
					log.Printf("⏱ Feed %s parsed in %v", url, time.Since(start))

					for _, item := range feed.Items {
						if len(articles) >= 5 {
							break
						}

						origTitle := item.Title
						origDesc := item.Description
						title := origTitle
						desc := origDesc

						if translate && hasMapping && lang != "EN" {
							if t, err := localization.TranslateText(origTitle, lang); err == nil {
								title = t
							}
							if origDesc != "" {
								if tDesc, err := localization.TranslateText(origDesc, lang); err == nil {
									desc = tDesc
								}
							}
						}

						articles = append(articles, NewsArticle{
							Title:               title,
							OriginalTitle:       origTitle,
							Link:                item.Link,
							Description:         desc,
							OriginalDescription: origDesc,
							Published:           item.Published,
							Source:              feed.Title,
						})
					}

					feedCache.Set(cacheKey, articles, cache.DefaultExpiration)
				}
			}

			mu.Lock()
			defer mu.Unlock()

			if len(all) >= limit {
				return
			}
			remaining := limit - len(all)
			if len(articles) > remaining {
				all = append(all, articles[:remaining]...)
			} else {
				all = append(all, articles...)
			}
		}(url)
	}
	wg.Wait()

	log.Printf("📦 Total articles collected for %s: %d", code, len(all))
	return all, nil
}

// TestFeedURL returns the parsed feed data from a given URL.
func TestFeedURL(url string) (*gofeed.Feed, error) {
	return parser.ParseURL(url)
}
