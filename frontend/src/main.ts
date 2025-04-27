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
  }
}

// Initialize and start the application
startApp(setLoadingSubtitle).then(({ animate, startHoverSystem }) => {
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

  // Trigger fade-out transition of the loading screen
  loadingScreen.classList.add("fade-out");

  // Wait for transition to complete before removing loading screen and showing the app
  loadingScreen.addEventListener("transitionend", () => {
    setTimeout(() => {
      loadingScreen.remove();
      appContainer.classList.add("visible");

      animate();
      startHoverSystem().catch((err) => {
        console.error("Error in hover system initialization:", err);
      });
    }, 200);
  });
});
