// src/features/news/handleNewsPanel.ts
/**
 * @file handleNewsPanel.ts
 * @description Controls the draggable, interactive country news panel. Handles UI state, data fetching, and dynamic rendering.
 */

import { countryMeta } from '@/core/data/countryMeta';
import { appState } from '@/state/appState';

let isFetchingNews = false;
const initialTop = 20;
const initialRight = 20;

/**
 * Initializes the news panel by binding close/reset behavior and enabling drag functionality.
 */
export function initNewsPanel(
  selectedCountryIds: Set<number>,
  selectedFlags: Uint8Array
): void {
  const panel = document.getElementById("news-panel")!;
  const closeBtn = document.getElementById("news-close")!;
  const resetBtn = document.getElementById("news-reset")!;

  closeBtn.onclick = () => {
    performPanelClose(panel);

    const lastId = appState.lastOpenedCountryId;
    if (lastId !== null) {
      selectedCountryIds.delete(lastId);
      selectedFlags[lastId - 1] = 0;
      appState.lastOpenedCountryId = null;
    }
  };

  resetBtn.onclick = () => {
    const isAlreadyDefault =
      panel.style.top === `${initialTop}px` &&
      panel.style.right === `${initialRight}px`;

    if (!isAlreadyDefault) {
      resetPanelPosition(panel);
    }
  };

  makeDraggable(panel);
}

/**
 * Shows the news panel with top articles for a given country ISO code.
 */
export async function showNewsPanel(isoCode: string): Promise<void> {
  if (isFetchingNews) return;
  isFetchingNews = true;

  const API_BASE =
    import.meta.env.VITE_NEWS_API_URL || "http://localhost:8080";

  const panel = document.getElementById("news-panel")!;
  const title = document.getElementById("news-title")!;
  const content = document.getElementById("news-content")!;
  const toggleButton = document.getElementById(
    "translate-toggle"
  ) as HTMLButtonElement;

  const entry = Object.values(countryMeta).find((c) => c.iso === isoCode);
  const displayName = entry?.name || isoCode;

  resetPanelPosition(panel);
  panel.classList.remove("fade-out", "closing");
  panel.classList.add("open");
  panel.style.display = "";

  title.textContent = `Top News from ${displayName}`;
  title.style.textAlign = "center";
  title.style.fontSize = "1rem";
  title.style.marginBottom = "0.25rem";

  let currentNews: any[] = [];
  let useTranslation = sessionStorage.getItem("translatePref") === "true";

  const render = () => {
    content.innerHTML = renderNewsItems(currentNews, useTranslation);
    toggleButton.textContent = useTranslation
      ? "🌐 Show Original Language"
      : "🌐 Translate to English";
    toggleButton.disabled = false;
    toggleButton.classList.remove("disabled");
  };

  const loadNews = async () => {
    content.innerHTML = `
      <div class="news-loading-wrapper">
        <span class="news-loading-text">Loading</span>
        <span class="news-dots">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </span>
      </div>`;
    toggleButton.disabled = true;
    toggleButton.classList.add("disabled");

    try {
      const res = await fetch(
        `${API_BASE}/api/news?country=${isoCode}${
          useTranslation ? "&translate=true" : ""
        }`
      );

      if (res.status === 204) {
        content.innerHTML = `<strong>No news found for ${displayName}</strong>`;
        return;
      }
      if (!res.ok) {
        console.warn(
          `[News API] Non-OK response: ${res.status} for ${isoCode}`
        );
        content.innerHTML = `<strong style="color: red;">Failed to fetch news</strong>`;
        return;
      }

      currentNews = await res.json();
      render();
    } catch (err) {
      console.error("[News API] Fetch failed:", err);
      content.innerHTML = `<strong style="color: red;">Failed to fetch news</strong>`;
    }
  };

  toggleButton.onclick = async () => {
    useTranslation = !useTranslation;
    sessionStorage.setItem("translatePref", String(useTranslation));
    await loadNews();
  };

  await loadNews();
  isFetchingNews = false;
}

/**
 * Renders the fetched news items into HTML list.
 */
function renderNewsItems(newsItems: any[], translate = true): string {
  return `
    <div id="news-list" class="fade-in">
      <ul>
        ${newsItems
          .map((item) => {
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
    </div>`;
}

/**
 * Makes the news panel draggable.
 */
function makeDraggable(panel: HTMLElement): void {
  const header = panel.querySelector(".news-panel-header") as HTMLElement;
  if (!header) return;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    panel.style.top = `${e.clientY - offsetY}px`;
    panel.style.left = `${e.clientX - offsetX}px`;
    panel.style.right = "";
  };

  const onMouseUp = () => {
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  header.onmousedown = (e) => {
    isDragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };
}

/**
 * Resets the panel position to its default top-right location.
 */
function resetPanelPosition(panel: HTMLElement): void {
  panel.style.top = `${initialTop}px`;
  panel.style.right = `${initialRight}px`;
  panel.style.left = "";
  panel.style.bottom = "";
  panel.style.transform = "none";
}

/**
 * Hides the news panel with fade-out or slide-out animation.
 */
export function hideNewsPanel(): void {
  const panel = document.getElementById("news-panel");
  if (panel) {
    performPanelClose(panel);
  } else {
    console.warn("[hideNewsPanel] Panel not found");
  }
}

/**
 * Animates panel closure depending on its position.
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
