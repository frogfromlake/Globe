// vite.config.ts
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
    target: "esnext", // modern JS features, no downleveling
    sourcemap: isAnalyze, // disable maps unless analyzing

    outDir: "dist",
    minify: isAnalyze ? "terser" : "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("three")) return "vendor-three";
            if (id.includes("gsap")) return "vendor-gsap";
            if (id.includes("three/examples")) return "vendor-examples";
            return "vendor";
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
    },
  },
});
