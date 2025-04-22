export async function fetchCountryNews(isoCode: string) {
  try {
    const res = await fetch(
      `http://localhost:8080/api/news?country=${isoCode}`
    );

    if (res.status === 204) {
      return []; // Gracefully handle no content
    }

    if (!res.ok) throw new Error("Failed to fetch news");

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("News fetch error:", err);
    return []; // ✅ Safe fallback
  }
}
