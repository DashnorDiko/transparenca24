import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "scripts/fraud/__tests__/**/*.test.ts",
      "scripts/__tests__/**/*.test.ts",
      "components/__tests__/**/*.test.tsx",
    ],
  },
});
