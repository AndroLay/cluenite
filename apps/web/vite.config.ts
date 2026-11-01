import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: "../..",
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:10000",
      "/socket.io": { target: "http://127.0.0.1:10000", ws: true },
    },
  },
});
