import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

// Define the config
export default defineConfig({
  plugins: [
    glsl({
      include: ["**/*.vert", "**/*.frag"], // Enable these shader types
    }),
  ],
  base: "./",
  build: {
    outDir: "dist", // Output directory for the build
    rollupOptions: {
      external: [
        // Exclude all files in the 'dev' folder from being bundled
        "src/dev/*",
      ],
    },
  },
});
