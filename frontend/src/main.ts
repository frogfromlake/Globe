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
startApp(setLoadingSubtitle).then(({ animate }) => {
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
    loadingScreen.remove();
    appContainer.classList.add("visible");

    // Start the main rendering loop
    animate();
  });
});
