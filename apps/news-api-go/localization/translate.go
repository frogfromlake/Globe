package localization

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/patrickmn/go-cache"
)

var (
	translationCache = cache.New(24*time.Hour, 1*time.Hour)
	deepLEndpoint    = "https://api-free.deepl.com/v2/translate"
)

func getDeepLApiKey() string {
	return os.Getenv("DEEPL_API_KEY")
}

// TranslateText translates the input text into English using DeepL,
// skipping the call if sourceLang is already English.
func TranslateText(text, sourceLang string) (string, error) {
	key := getDeepLApiKey()
	if key == "" {
		return "", errors.New("DEEPL_API_KEY is not set")
	}

	trimmed := strings.TrimSpace(text)

	// ⛔ Skip translation if already English
	normalizedLang := strings.ToUpper(strings.Split(sourceLang, "-")[0])
	if normalizedLang == "EN" {
		log.Printf("↩️  Skipped translation (already English): %s", trimmed)
		return trimmed, nil
	}

	cacheKey := fmt.Sprintf("%s|%s", sourceLang, trimmed)

	if cached, found := translationCache.Get(cacheKey); found {
		log.Printf("🧠 Cache hit for %s (%s)", trimmed, sourceLang)
		return cached.(string), nil
	}

	log.Printf("🌍 Translating %s (%s)", trimmed, sourceLang)

	data := fmt.Sprintf(
		"auth_key=%s&text=%s&source_lang=%s&target_lang=EN",
		key,
		escape(trimmed),
		normalizedLang,
	)

	req, err := http.NewRequest("POST", deepLEndpoint, bytes.NewBufferString(data))
	if err != nil {
		return "", fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("deepl error %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Translations []struct {
			Text string `json:"text"`
		} `json:"translations"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode DeepL response: %w", err)
	}

	if len(result.Translations) == 0 {
		return "", errors.New("no translations returned")
	}

	translated := result.Translations[0].Text
	translationCache.Set(cacheKey, translated, cache.DefaultExpiration)
	return translated, nil
}

func escape(s string) string {
	return strings.ReplaceAll(s, "&", "%26")
}
