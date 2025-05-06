import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

const isAnalyze = process.env.npm_lifecycle_event === "analyze";

export default defineConfig({
  plugins: [
    glsl({
      include: ["**/*.vert", "**/*.frag"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "./",
  build: {
    sourcemap: true,
    minify: isAnalyze ? "terser" : "esbuild",
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Auto-split big external libraries by folder name
          if (id.includes("node_modules")) {
            if (id.includes("three")) return "vendor-three";
            if (id.includes("gsap")) return "vendor-gsap";
            if (id.includes("three/examples")) return "vendor-examples";
            return "vendor"; // Default bucket for any other node_modules
          }
        },
      },
      plugins: isAnalyze
        ? [
            visualizer({
              open: true,
              filename: "dist/bundle-analysis.html",
              brotliSize: true,
              gzipSize: true,
            }),
          ]
        : [],
      external: ["src/dev/*"],
    },
  },
});
