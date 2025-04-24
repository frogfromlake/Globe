/**
 * @file handleNewsPanel.ts
 * @description Controls the draggable, interactive country news panel. Handles UI state, data fetching, and dynamic rendering.
 */

let isFetchingNews = false;
const initialTop = 20;
const initialRight = 20;

/**
 * Initializes the news panel by binding close/reset behavior and enabling drag functionality.
 */
export function initNewsPanel(): void {
  const panel = document.getElementById("news-panel")!;
  const closeBtn = document.getElementById("news-close")!;
  const resetBtn = document.getElementById("news-reset")!;

  closeBtn.onclick = () => performPanelClose(panel);

  resetBtn.onclick = () => {
    const isAlreadyDefault =
      panel.style.top === `${initialTop}px` &&
      panel.style.right === `${initialRight}px`;

    if (!isAlreadyDefault) {
      panel.style.top = `${initialTop}px`;
      panel.style.right = `${initialRight}px`;
      panel.style.left = "";
      panel.style.bottom = "";
      panel.style.transform = "none";
    }
  };

  makeDraggable(panel);
}

/**
 * Fetches and displays top news for a given ISO country code.
 * @param isoCode - The ISO country code to fetch news for.
 */
export async function showNewsPanel(isoCode: string): Promise<void> {
  if (isFetchingNews) return;
  isFetchingNews = true;

  const API_BASE =
    import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:8080";
  const panel = document.getElementById("news-panel")!;
  const title = document.getElementById("news-title")!;
  const content = document.getElementById("news-content")!;

  // Reset and display the panel
  panel.classList.remove("fade-out", "closing");
  panel.classList.add("open");
  panel.style.display = "";
  panel.style.top = `${initialTop}px`;
  panel.style.right = `${initialRight}px`;
  panel.style.left = "";
  panel.style.bottom = "";
  panel.style.transform = "none";

  // Center the title visually
  title.textContent = `Top News from ${isoCode}`;
  title.style.display = "block";
  title.style.width = "100%";
  title.style.textAlign = "center";
  title.style.fontSize = "1rem";
  title.style.marginBottom = "0.25rem";

  // Show loading text
  content.innerHTML = `<strong style="opacity: 0.8;">Loading...</strong>`;

  try {
    const res = await fetch(`${API_BASE}/api/news?country=${isoCode}`);
    if (res.status === 204) {
      content.innerHTML = `<strong>No news found for ${isoCode}</strong>`;
      isFetchingNews = false;
      return;
    }

    if (!res.ok) {
      console.warn(`[News API] Non-OK response: ${res.status} for ${isoCode}`);
      content.innerHTML = `<strong style="color: red;">Failed to fetch news</strong>`;
      isFetchingNews = false;
      return;
    }

    const data = await res.json();
    let currentNews = data;
    const toggleButton = document.getElementById(
      "translate-toggle"
    ) as HTMLButtonElement;

    // Persisted translation toggle preference across sessions (default: true)
    let useTranslation = sessionStorage.getItem("translatePref") !== "false";

    const render = () => {
      content.innerHTML = renderNewsItems(currentNews, useTranslation);
      toggleButton.textContent = useTranslation
        ? "🌐 Show Original Language"
        : "🌐 Translate to English";
    };

    if (toggleButton) {
      toggleButton.onclick = () => {
        useTranslation = !useTranslation;
        sessionStorage.setItem("translatePref", String(useTranslation));
        render();
      };
    }

    render();
  } catch (err) {
    console.error("[News Fetch Error]:", err);
    content.innerHTML = `<strong style="color: red;">Failed to fetch news</strong>`;
  } finally {
    isFetchingNews = false;
  }
}

/**
 * Renders a list of news items as HTML.
 * @param newsItems - Array of news objects.
 * @param translate - Whether to use the translated text.
 * @returns Rendered HTML string.
 */
function renderNewsItems(newsItems: any[], translate = true): string {
  return `
    <ul>
      ${newsItems
        .map((item: any) => {
          const title = translate
            ? item.title
            : item.originalTitle || item.title;
          const desc = translate
            ? item.description
            : item.originalDescription || item.description;

          return `
            <li>
              <a href="${item.link}" target="_blank">${title}</a><br/>
              <small>${item.source} – ${item.published || ""}</small><br/>
              <em style="opacity: 0.7;">${desc || ""}</em>
            </li>`;
        })
        .join("")}
    </ul>
  `;
}

/**
 * Makes the news panel draggable via its header.
 * @param panel - The news panel element.
 */
function makeDraggable(panel: HTMLElement): void {
  const header = panel.querySelector(".news-panel-header") as HTMLElement;
  if (!header) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.onmousedown = (e) => {
    isDragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;

    document.onmousemove = (e) => {
      if (!isDragging) return;
      panel.style.top = `${e.clientY - offsetY}px`;
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.right = "";
    };

    document.onmouseup = () => {
      isDragging = false;
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

/**
 * Hides the currently open news panel with fade-out or slide-out animation.
 */
export function hideNewsPanel(): void {
  const panel = document.getElementById("news-panel");
  if (panel) {
    performPanelClose(panel);
  } else {
    console.warn("[hideNewsPanel] Panel element not found");
  }
}

/**
 * Closes the news panel with appropriate animation based on its current position.
 * @param panel - The panel element to close.
 */
function performPanelClose(panel: HTMLElement): void {
  const isAtDefault =
    panel.style.top === `${initialTop}px` &&
    panel.style.right === `${initialRight}px` &&
    !panel.style.left;

  panel.classList.remove("open");

  if (isAtDefault) {
    panel.style.right = "-26rem";
    panel.classList.add("closing");
    setTimeout(() => panel.classList.remove("closing"), 350);
  } else {
    panel.classList.add("fade-out");
    setTimeout(() => {
      panel.classList.remove("fade-out");
      panel.style.display = "none";
    }, 350);
  }
}
