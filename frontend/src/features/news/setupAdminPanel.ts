/**
 * @file setupAdminPanel.ts
 * @description Dynamically sets up the admin panel toggle buttons for local development.
 * Displays toggle and hide buttons when visiting `/#admin` or if previously activated in sessionStorage.
 */

export function setupAdminPanel(): void {
  // Only activate in development mode
  if (import.meta.env.MODE !== "development") return;

  import("./createAdminPanel").then(({ createAdminPanel }) => {
    const admin = createAdminPanel();

    // === Create Toggle Button ===
    const toggleAdminBtn = document.createElement("button");
    toggleAdminBtn.id = "toggle-admin";
    toggleAdminBtn.textContent = "🛠 Admin";
    Object.assign(toggleAdminBtn.style, {
      display: "none",
      position: "fixed",
      bottom: "1rem",
      left: "1rem",
      zIndex: "1000",
      padding: "0.5rem 1rem",
      background: "#333",
      color: "white",
      border: "none",
      borderRadius: "0.25rem",
      cursor: "pointer",
    });
    document.body.appendChild(toggleAdminBtn);

    // === Create Hide Button ===
    const hideAdminBtn = document.createElement("button");
    hideAdminBtn.id = "hide-admin";
    hideAdminBtn.textContent = "❌ Hide Admin";
    Object.assign(hideAdminBtn.style, {
      display: "none",
      position: "fixed",
      bottom: "1rem",
      left: "7rem",
      zIndex: "1000",
      padding: "0.5rem 1rem",
      background: "#444",
      color: "white",
      border: "none",
      borderRadius: "0.25rem",
      cursor: "pointer",
    });
    document.body.appendChild(hideAdminBtn);

    // === Toggle Panel Visibility ===
    toggleAdminBtn.addEventListener("click", async () => {
      const success = await admin.toggle();
      if (!success) {
        console.warn("❌ Admin toggle aborted due to auth failure");
      }
    });

    // === Hide Panel Button Behavior ===
    hideAdminBtn.addEventListener("click", () => {
      toggleAdminBtn.style.display = "none";
      hideAdminBtn.style.display = "none";
      sessionStorage.removeItem("adminVisible");
    });

    // === Restore Visibility from Session or Hash ===
    if (sessionStorage.getItem("adminVisible")) {
      toggleAdminBtn.style.display = "block";
      hideAdminBtn.style.display = "block";
    }

    if (
      window.location.hash === "#admin" &&
      !sessionStorage.getItem("adminVisible")
    ) {
      toggleAdminBtn.style.display = "block";
      hideAdminBtn.style.display = "block";
      sessionStorage.setItem("adminVisible", "true");
      history.replaceState(null, "", window.location.pathname);
    }

    // === Listen for hash-based toggle requests ===
    window.addEventListener("hashchange", () => {
      if (window.location.hash === "#admin") {
        toggleAdminBtn.style.display = "block";
        hideAdminBtn.style.display = "block";
        sessionStorage.setItem("adminVisible", "true");
        history.replaceState(null, "", window.location.pathname);
      }
    });
  });
}
