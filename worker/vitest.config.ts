import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    exclude: ["e2e/**"],
    reporters: ["default", "junit"],
    silent: true,
    outputFile: {
      junit: "junit.xml",
    },
    coverage: {
      enabled: true,
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/**/*"],
      reporter: [
        ["text", { file: "full-text-summary.txt" }],
        "html",
        "json",
        "lcov",
        "cobertura",
        ["json-summary", { outputFile: "coverage-summary.json" }],
      ],
    },
  },
});