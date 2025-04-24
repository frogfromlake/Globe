export function setupAdminPanel() {
  if (import.meta.env.MODE !== "development") return;

  import("./adminFeedPanel").then(({ createAdminFeedPanel }) => {
    const admin = createAdminFeedPanel();

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

    toggleAdminBtn.addEventListener("click", async () => {
      const success = await admin.toggle();
      if (!success) {
        console.warn("❌ Admin toggle aborted due to auth failure");
      }
    });

    hideAdminBtn.addEventListener("click", () => {
      toggleAdminBtn.style.display = "none";
      hideAdminBtn.style.display = "none";
      sessionStorage.removeItem("adminVisible");
    });

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
