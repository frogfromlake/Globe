let isFetchingNews = false;
let initialTop = 20;
let initialRight = 20;

export function initNewsPanel() {
  const panel = document.getElementById("news-panel")!;
  const closeBtn = document.getElementById("news-close")!;
  const resetBtn = document.getElementById("news-reset")!;

  closeBtn.onclick = () => {
    performPanelClose(panel);
  };

  resetBtn.onclick = () => {
    const currentTop = panel.style.top;
    const currentRight = panel.style.right;
    const isAlreadyDefault =
      currentTop === `${initialTop}px` && currentRight === `${initialRight}px`;

    if (isAlreadyDefault) return;

    panel.style.top = `${initialTop}px`;
    panel.style.right = `${initialRight}px`;
    panel.style.left = "";
    panel.style.bottom = "";
    panel.style.transform = "none";
  };

  makeDraggable(panel);
}

export async function showNewsPanel(isoCode: string) {
  if (isFetchingNews) return;
  isFetchingNews = true;

  const API_BASE =
    import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:8080";
  const panel = document.getElementById("news-panel")!;
  const title = document.getElementById("news-title")!;
  const content = document.getElementById("news-content")!;

  panel.classList.remove("fade-out");
  panel.style.display = ""; // show again if hidden

  // Prevent re-opening during slide-out
  if (panel.classList.contains("closing")) return;

  // Reset closing state and open
  panel.classList.remove("closing");
  panel.classList.add("open");

  // Reset position if needed
  panel.style.top = `${initialTop}px`;
  panel.style.right = `${initialRight}px`;
  panel.style.left = "";
  panel.style.bottom = "";
  panel.style.transform = "none";

  // Show loading state
  title.textContent = `Top News from ${isoCode}`;
  content.innerHTML = `<strong style="opacity: 0.8;">Loading...</strong>`;

  try {
    const res = await fetch(`${API_BASE}/api/news?country=${isoCode}`);
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

function makeDraggable(panel: HTMLElement) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const header = panel.querySelector(".news-panel-header") as HTMLElement;
  if (!header) return;

  header.onmousedown = (e) => {
    isDragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;

    document.onmousemove = (e) => {
      if (!isDragging) return;
      panel.style.top = `${e.clientY - offsetY}px`;
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.right = ""; // clear right so left-based drag works
    };

    document.onmouseup = () => {
      isDragging = false;
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

export function hideNewsPanel() {
  const panel = document.getElementById("news-panel");
  if (panel) {
    console.log("[hideNewsPanel] Hiding panel");
    performPanelClose(panel);
  } else {
    console.warn("[hideNewsPanel] Panel not found");
  }
}

function performPanelClose(panel: HTMLElement) {
  const initialTop = 20;
  const initialRight = 20;

  const isAtDefault =
    panel.style.top === `${initialTop}px` &&
    panel.style.right === `${initialRight}px` &&
    !panel.style.left;

  panel.classList.remove("open");

  if (isAtDefault) {
    panel.style.left = "";
    panel.style.right = "-26rem";
    panel.classList.add("closing");

    setTimeout(() => {
      panel.classList.remove("closing");
    }, 350);
  } else {
    panel.classList.add("fade-out");

    setTimeout(() => {
      panel.classList.remove("fade-out");
      panel.style.display = "none";
    }, 350);
  }
}
