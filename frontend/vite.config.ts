import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // In `vite build` the bundle is emitted to ../web/dist/ and served by
  // PHP's built-in server at /web/dist/*, so asset URLs in index.html must
  // be prefixed accordingly. The dev server keeps base "/" so /web/ still
  // works at http://localhost:5173/web/.
  base: command === "build" ? "/web/dist/" : "/",
  build: {
    outDir: "../web/dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: false,
      },
    },
  },
}));
