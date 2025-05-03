/**
 * Entry point of the OrbitalOne application.
 *
 * Responsibilities:
 * - Initialize and start the core 3D Earth visualization.
 * - Manage loading screen transitions.
 * - Set the loading subtitle text dynamically during the app boot sequence.
 */

import { startApp } from "./core/startApp";
/**
 * Injects the Vercel Analytics script into the document.
 */
import { inject } from "@vercel/analytics";
/**
 * Injects the Vercel Speed Insights script into the document.
 */
import { injectSpeedInsights } from "@vercel/speed-insights";

performance.mark("start-app-init");

/**
 * Updates the loading subtitle displayed during application initialization.
 *
 * @param text - The message to display in the subtitle element.
 */
function setLoadingSubtitle(text: string): void {
  const subtitle = document.querySelector(".subtitle") as HTMLElement | null;
  if (subtitle) {
    subtitle.textContent = text;
    subtitle.classList.add("visible");
  }
}

setLoadingSubtitle("Initializing orbital launch sequence...");

// Initialize and start the application
startApp(setLoadingSubtitle).then(({ animate }) => {
  performance.mark("start-app-done");

  performance.measure("App Init", "start-app-init", "start-app-done");
  const [entry] = performance.getEntriesByName("App Init");
  console.log(
    `📈 %cApp Init took ${entry.duration.toFixed(2)} ms`,
    "color: #4caf50; font-weight: bold"
  );

  // Inject Vercel Analytics script
  inject();
  // Inject Vercel Speed Insights script
  injectSpeedInsights();

  const loadingScreen = document.getElementById("loading-screen");
  const appContainer = document.getElementById("app-container");

  if (!loadingScreen || !appContainer) {
    console.error("[main.ts] Critical DOM elements missing.");
    return;
  }

  loadingScreen.classList.add("fade-out");
  appContainer.classList.add("visible");

  setTimeout(() => {
    loadingScreen.remove();
    animate();
  }, 600); // Just enough to finish the fade, no delay after that
});
