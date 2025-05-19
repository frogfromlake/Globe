/// <reference types="vite/client" />

/**
 * @file env.d.ts
 * @description Type declarations for environment variables used in the project.
 * This includes references to Vite's environment-specific variables,
 * such as API base URLs, to ensure type safety and proper usage across the application.
 */

/**
 * Interface for environment variables specific to this project.
 * These variables are injected by Vite during the build process.
 */
interface ImportMetaEnv {
  /**
   * @property {string | undefined} VITE_NEWS_API_URL - The base URL for the public API.
   */
  readonly VITE_NEWS_API_URL?: string;

  /**
   * @property {string} VITE_TILE_PROXY_URL - The base URL for the tile proxy.
   * This is required to resolve tile URLs in production and development.
   */
  readonly VITE_TILE_PROXY_URL: string;
}

/**
 * Extends the Vite `ImportMeta` interface to include our custom environment variables.
 * This allows for accessing environment variables in a type-safe manner throughout the application.
 */
interface ImportMeta {
  /**
   * Access to the environment variables defined in the project.
   * These variables are available at build time.
   */
  readonly env: ImportMetaEnv;
}
