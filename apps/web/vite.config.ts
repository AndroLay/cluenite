import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// The dev proxy follows the API port. Set it in the shell, for example
// CLUENITE_API_PORT=10001 npm --prefix apps/web run dev. It is read from the process
// environment, not from .env, and defaults to the server's PORT default of 10000.
const apiOrigin = `http://127.0.0.1:${process.env.CLUENITE_API_PORT ?? "10000"}`;

export default defineConfig({
  envDir: "../..",
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      "/api": apiOrigin,
      "/socket.io": { target: apiOrigin, ws: true },
    },
  },
});
