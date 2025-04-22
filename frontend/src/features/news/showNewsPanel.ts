let isFetchingNews = false;

export async function showNewsPanel(isoCode: string) {
  if (isFetchingNews) return;
  isFetchingNews = true;

  const panel = document.getElementById("news-panel")!;
  const title = document.getElementById("news-title")!;
  const content = document.getElementById("news-content")!;
  const closeBtn = document.getElementById("news-close")!;

  // Open panel if closed
  panel.classList.add("open");

  // Show loading state
  title.textContent = `Top News from ${isoCode}`;
  content.innerHTML = `<strong style="opacity: 0.8;">Loading...</strong>`;

  try {
    const res = await fetch(
      `http://localhost:8080/api/news?country=${isoCode}`
    );
    if (res.status === 204) {
      content.innerHTML = `<strong>No news found for ${isoCode}</strong>`;
      return;
    }
    if (!res.ok) throw new Error("Failed to fetch news");

    const data = await res.json();
    content.innerHTML = renderNewsItems(data);
  } catch (err) {
    console.error("News fetch error:", err);
    content.innerHTML = `<strong style="color: red;">Failed to fetch news</strong>`;
  } finally {
    isFetchingNews = false;
  }

  // Hook close button
  closeBtn.onclick = () => panel.classList.remove("open");
}

function renderNewsItems(newsItems: any[]) {
  return `
    <ul>
      ${newsItems
        .map(
          (item: any) => `
        <li>
          <a href="${item.link}" target="_blank">${item.title}</a><br/>
          <small>${item.source} – ${item.published || ""}</small>
        </li>`
        )
        .join("")}
    </ul>
  `;
}
