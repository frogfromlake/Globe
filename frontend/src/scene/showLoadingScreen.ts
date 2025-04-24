export const loadingMessages = {
  countryTextures: [
    "Untangling international spaghetti lines...",
    "Negotiating peace between polygons...",
    "Locating all the microstates (again)...",
  ],
  oceanTextures: [
    "Flooding the planet responsibly...",
    "Tuning whale song frequencies...",
    "Releasing krakens into containment...",
  ],
  labels: [
    "Spelling 'Kyrgyzstan' correctly...",
    "Polishing tiny country signs...",
    "Giving each country a name tag (not sticky)...",
  ],
  atmosphere: [
    "Airbrushing the stratosphere...",
    "Ionizing upper fluff layers...",
    "Brewing space tea in the thermosphere...",
  ],
  final: [
    "Aligning orbital chakras...",
    "Injecting humor into the launch codes...",
    "Counting down with dramatic flair...",
  ],
};

export function randomMessage(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function runWithLoadingMessage<T>(
  messagePool: string[],
  updateSubtitle: (text: string) => void,
  action: () => Promise<T> | T
): Promise<T> {
  updateSubtitle(randomMessage(messagePool));
  return await action();
}

export function showLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  const appContainer = document.getElementById("app-container");

  if (loadingScreen && appContainer) {
    loadingScreen.classList.add("fade-out");
    setTimeout(() => {
      appContainer.classList.add("visible");
    }, 1200);
  }
}
