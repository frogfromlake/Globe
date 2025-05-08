/**
 * Entry point of the OrbitalOne application.
 * Responsibilities:
 * - Initialize and start the core 3D Earth visualization.
 * - Manage loading screen transitions.
 * - Set the loading subtitle text dynamically during app boot.
 */
(async () => {
  const { startApp } = await import("./startApp");
  const { inject } = await import("@vercel/analytics");
  const { injectSpeedInsights } = await import("@vercel/speed-insights");

  performance.mark("start-app-init");

  function setLoadingSubtitle(text: string): void {
    const subtitle = document.querySelector(".subtitle") as HTMLElement | null;
    if (subtitle) {
      subtitle.textContent = text;
      subtitle.classList.add("visible");
    }
  }

  setLoadingSubtitle("Initializing orbital launch sequence...");

  const { animate, waitForEssentialTextures } = await startApp(
    setLoadingSubtitle
  );

  await waitForEssentialTextures; // Ensure visuals are ready before fade-out

  performance.mark("start-app-done");
  performance.measure("App Init", "start-app-init", "start-app-done");

  const [entry] = performance.getEntriesByName("App Init");
  console.log(
    `📈 %cApp Init took ${entry.duration.toFixed(2)} ms`,
    "color: #4caf50; font-weight: bold"
  );

  inject();
  injectSpeedInsights();

  const loadingScreen = document.getElementById("loading-screen");
  const appContainer = document.getElementById("app-container");

  if (!loadingScreen || !appContainer) {
    console.error("[main.ts] Critical DOM elements missing.");
    return;
  }

  loadingScreen.classList.add("fade-out");
  appContainer.classList.add("visible");
  document.body.classList.add("ready");

  setTimeout(() => {
    loadingScreen.remove();
    animate();
  }, 600);
})();
