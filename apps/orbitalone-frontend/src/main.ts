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

  const { waitForEssentialTextures, waitUntilInteractiveReady } =
    await startApp(setLoadingSubtitle);

  // Begin fading out loader immediately after first globe render
  const loadingScreen = document.getElementById("loading-screen");
  const appContainer = document.getElementById("app-container");

  if (!loadingScreen || !appContainer) {
    console.error("[main.ts] Critical DOM elements missing.");
    return;
  }

  loadingScreen.classList.add("fade-out");
  appContainer.classList.add("visible");
  document.body.classList.add("ready");

  // Remove loading screen after transition ends (no hardcoded delay)
  loadingScreen.addEventListener("transitionend", () => {
    loadingScreen.remove();

    requestAnimationFrame(() => {
      console.log("🌀 Frame rendered post-fade");
    });
  });

  // Optionally show subtitle update when core visuals are loaded
  await waitForEssentialTextures;
  setLoadingSubtitle("Enhancing visuals...");

  await waitUntilInteractiveReady;
  setLoadingSubtitle("Ready for liftoff...");

  // === Performance Markers ===
  performance.mark("start-app-done");

  performance.measure(
    "1. Basic Init",
    "start-app-init",
    "startApp:basic-init-done"
  );
  performance.measure(
    "2. Scene Setup",
    "startApp:basic-init-done",
    "startApp:core-scene-ready"
  );
  performance.measure(
    "4. Ready for Interaction",
    "startApp:core-scene-ready",
    "startApp:interactive-ready"
  );
  performance.measure("5. Total App Init", "start-app-init", "start-app-done");
  performance.measure(
    "First Frame Delay",
    "start-app-init",
    "first-frame-rendered"
  );
  performance.measure("App Init", "start-app-init", "start-app-done");

  // === Display Results ===
  setTimeout(() => {
    const [entry] = performance.getEntriesByName("App Init");
    console.log(
      `📈 %cApp Init took ${entry.duration.toFixed(2)} ms`,
      "color: #4caf50; font-weight: bold"
    );

    const allMeasures = performance.getEntriesByType("measure");

    console.group("📊 OrbitalOne Startup Breakdown");
    console.table(
      allMeasures
        .filter((entry) => entry.name.match(/^\d/)) // only steps with numbered names
        .map(({ name, duration }) => ({
          Step: name,
          Duration: `${duration.toFixed(2)} ms`,
        }))
    );
    console.groupEnd();
  }, 0);

  inject();
  injectSpeedInsights();

  // Animate loop was already started in startApp()
})();
