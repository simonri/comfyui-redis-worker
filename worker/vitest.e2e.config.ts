import base from "./vitest.config";

export default {
  ...base,
  test: {
    ...base.test,
    include: ["e2e/**/*.spec.ts"],
    exclude: [],
    hookTimeout: 90_000,
    testTimeout: 90_000,
    reporters: ["default"],
    silent: false,
    parallel: false,
  },
};