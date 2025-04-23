// src/main.ts
import { startApp } from "./core/startApp";

// Function to update the loading subtitle text
function setLoadingSubtitle(text: string) {
  const subtitle = document.querySelector(".subtitle") as HTMLElement;
  if (subtitle) subtitle.textContent = text;
}

// Start the app and handle fade-out and fade-in transitions
startApp(setLoadingSubtitle).then(({ animate }) => {
  const loadingScreen = document.getElementById("loading-screen")!;
  const appContainer = document.getElementById("app-container")!;

  // Start fade-out
  loadingScreen.classList.add("fade-out");

  // When transition completes, remove loader and show app
  loadingScreen.addEventListener("transitionend", () => {
    loadingScreen.remove();
    appContainer.classList.add("visible");
    animate(); // Start render loop
  });
});
