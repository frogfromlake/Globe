// src/main.ts
import { startApp } from "./core/startApp";

// Start app but delay animation and fade-in until loading screen fades
startApp().then(({ animate }) => {
  const loadingScreen = document.getElementById("loading-screen")!;
  const appContainer = document.getElementById("app-container")!;

  loadingScreen.style.opacity = "0";

  loadingScreen.addEventListener("transitionend", () => {
    loadingScreen.remove(); // remove from DOM completely
    appContainer.classList.add("visible"); // triggers fade-in
    animate(); // start Three.js loop
  });
});
