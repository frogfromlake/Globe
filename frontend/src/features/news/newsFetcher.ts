export async function fetchCountryNews(isoCode: string) {
  const API_BASE =
    import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:8080";

  try {
    const res = await fetch(`${API_BASE}/api/news?country=${isoCode}`);

    if (res.status === 204) {
      return []; // Gracefully handle no content
    }

    if (!res.ok) throw new Error("Failed to fetch news");

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("News fetch error:", err);
    return []; // Safe fallback
  }
}
