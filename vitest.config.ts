import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Bound concurrent PostgreSQL fixtures and native Windows backend processes.
    maxWorkers: 2,
    include: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.cache/**",
      "**/.local/**",
      "docs/reference/**",
      "tests/e2e/**",
    ],
  },
});
