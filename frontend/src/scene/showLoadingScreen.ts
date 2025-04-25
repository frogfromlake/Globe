/**
 * showLoadingScreen.ts
 * Handles dynamic loading messages and loading screen transition effects.
 * Provides utility for displaying randomized humorous loading subtitles during async setup steps.
 */

/**
 * Pools of thematic loading messages per stage of the initialization process.
 */
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

/**
 * Picks a random string from the provided array.
 *
 * @param pool - An array of strings to choose from
 * @returns A randomly selected string
 */
export function randomMessage(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Executes a given async or sync action while updating the loading subtitle
 * with a randomly selected message from a themed pool.
 *
 * @param messagePool - The list of messages to randomly draw from
 * @param updateSubtitle - A callback to set the loading subtitle text
 * @param action - An async or sync function representing the loading step
 * @returns The result of the action
 */
export async function runWithLoadingMessage<T>(
  messagePool: string[],
  updateSubtitle: (text: string) => void,
  action: () => Promise<T> | T
): Promise<T> {
  updateSubtitle(randomMessage(messagePool));

  // Allow the DOM to update and the subtitle to be painted
  await Promise.resolve();
  await new Promise((resolve) => requestAnimationFrame(resolve));

  // Ensure subtitle is visible for at least 300ms
  await new Promise((resolve) => setTimeout(resolve, 300));

  return await action();
}

/**
 * Triggers the transition from the loading screen to the main app container.
 * Fades out the loading screen and shows the main interface after a delay.
 */
export function showLoadingScreen(): void {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.display = "flex";
  }
}

/**
 * Fades out the entire loading screen (spinner + subtitle + background).
 */
export function fadeOutLoadingScreen(): void {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.classList.add("fade-out");
  }
}
