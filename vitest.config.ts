import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
    },
  },
  test: {
    globals: true,
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "apps/api/**"],
    environment: "jsdom",
    setupFiles: ["./packages/ui/src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/**/src/**", "apps/web/src/**"],
      exclude: ["**/__tests__/**", "**/node_modules/**", "**/dist/**"],
    },
  },
})
