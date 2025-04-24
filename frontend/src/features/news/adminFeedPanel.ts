const API_BASE = import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:8080";

export function createAdminFeedPanel() {
  if (import.meta.env.MODE === "production") {
    throw new Error("🚫 Admin panel is disabled in production.");
  }

  const panel = document.createElement("div");
  panel.id = "admin-panel";
  panel.classList.add("hidden");
  document.body.appendChild(panel);

  let adminAuthHeader: string | null = localStorage.getItem("authHeader");
  let hasLoadedFeeds = false;

  async function promptForAuth(): Promise<boolean> {
    const user = prompt("Admin username:");
    const pass = prompt("Admin password:");
    if (!user || !pass) return false;

    const header = "Basic " + btoa(`${user}:${pass}`);
    const res = await fetch(`${API_BASE}/admin/ping`, {
      headers: { Authorization: header },
    });

    if (res.status === 200) {
      adminAuthHeader = header;
      localStorage.setItem("authHeader", header);
      return true;
    } else {
      alert("❌ Invalid credentials.");
      return false;
    }
  }

  async function ensureAdminAuth(): Promise<boolean> {
    if (!adminAuthHeader) {
      return await promptForAuth();
    }
    return true;
  }

  function handleAuthError() {
    adminAuthHeader = null;
    hasLoadedFeeds = false;
    localStorage.removeItem("authHeader");
    alert("🔒 Admin authentication failed. Please try again.");
  }

  panel.innerHTML = `
    <h2>Admin Feed Manager</h2>
    <label>Country Code (ISO2):</label>
    <input id="feed-country" type="text" placeholder="e.g. US" />
    <label>Feed URLs (comma separated):</label>
    <textarea id="feed-urls" placeholder="https://example.com/rss1, https://example.com/rss2"></textarea>
    <div style="margin-top: 0.5rem;">
      <button id="test-feed-btn">Test First URL</button>
      <button id="save-feed-btn">Save Feeds</button>
      <button id="admin-logout">🔓 Log Out</button>
      <button id="admin-close" style="float: right;">✖</button>

    </div>
    <div id="feed-result" style="margin-top: 1rem; font-size: 0.9rem;"></div>
    <hr style="margin: 1rem 0;" />
    <h3>Configured Feeds:</h3>
    <div id="feed-list"></div>
  `;

  const testBtn = panel.querySelector("#test-feed-btn") as HTMLButtonElement;
  const saveBtn = panel.querySelector("#save-feed-btn") as HTMLButtonElement;
  const closeBtn = panel.querySelector("#admin-close") as HTMLButtonElement;
  const result = panel.querySelector("#feed-result")!;
  const list = panel.querySelector("#feed-list")!;

  closeBtn.onclick = () => {
    panel.classList.add("hidden");
  };

  const logoutBtn = panel.querySelector("#admin-logout") as HTMLButtonElement;

  logoutBtn.onclick = () => {
    adminAuthHeader = null;
    hasLoadedFeeds = false;
    localStorage.removeItem("authHeader");

    panel.classList.add("hidden");
    alert("👋 Logged out of admin mode.");

    // Optional: auto-hide toggle buttons too
    const toggleAdminBtn = document.getElementById("toggle-admin");
    const hideAdminBtn = document.getElementById("hide-admin");
    toggleAdminBtn!.style.display = "none";
    hideAdminBtn!.style.display = "none";
    sessionStorage.removeItem("adminVisible");
  };

  testBtn.onclick = async () => {
    const urls = (
      panel.querySelector("#feed-urls") as HTMLTextAreaElement
    ).value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      result.textContent = "⚠️ Please enter at least one feed URL.";
      return;
    }

    if (!(await ensureAdminAuth())) return;

    try {
      const res = await fetch(
        `${API_BASE}/admin/test-feed?url=${encodeURIComponent(urls[0])}`,
        {
          headers: { Authorization: adminAuthHeader! },
        }
      );
      if (res.status === 401) return handleAuthError();

      const data = await res.json();
      result.textContent = `✅ Source: ${data.source}, Articles: ${data.articles}, First: ${data.firstItemTitle}`;
    } catch (err) {
      result.textContent = `❌ Failed to fetch feed: ${err}`;
    }
  };

  saveBtn.onclick = async () => {
    const country = (
      panel.querySelector("#feed-country") as HTMLInputElement
    ).value
      .trim()
      .toUpperCase();
    const urls = (
      panel.querySelector("#feed-urls") as HTMLTextAreaElement
    ).value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!country || urls.length === 0) {
      result.textContent = "⚠️ Missing country code or feeds.";
      return;
    }

    if (!(await ensureAdminAuth())) return;

    try {
      const res = await fetch(`${API_BASE}/admin/feeds/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: adminAuthHeader!,
        },
        body: JSON.stringify({ country, feeds: urls }),
      });

      if (res.status === 401) return handleAuthError();

      result.textContent = `✅ Feeds saved for ${country}`;
      await loadFeedList();
    } catch (err) {
      result.textContent = `❌ Save failed: ${err}`;
    }
  };

  async function loadFeedList() {
    try {
      const res = await fetch(`${API_BASE}/admin/feeds`);
      const data = await res.json();
      list.innerHTML = data
        .map(
          (f: any) =>
            `<div style="margin-bottom: 0.75rem;"><strong>${
              f.country
            }</strong>:<br/><code>${f.feeds.join("<br/>")}</code></div>`
        )
        .join("");
    } catch (err) {
      list.innerHTML = `<span style="color: red;">❌ Failed to load feeds</span>`;
    }
  }

  async function toggle(): Promise<boolean> {
    const isVisible = !panel.classList.contains("hidden");

    if (isVisible) {
      panel.classList.add("hidden");
      return true;
    } else {
      const ok = await ensureAdminAuth();
      if (!ok) {
        console.warn("❌ Auth check failed, panel will stay hidden");
        return false;
      }

      panel.classList.remove("hidden");

      if (!hasLoadedFeeds) {
        await loadFeedList();
        hasLoadedFeeds = true;
      }

      return true;
    }
  }

  return { panel, toggle };
}
