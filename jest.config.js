/**
 * Jest runs only the pure domain (game logic) — no React Native, no Skia.
 * The domain is intentionally platform-free, so a plain Node environment with
 * babel-jest (types stripped via babel-preset-expo) is all that's needed.
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/src/**/*.test.ts"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  // Watchman isn't available in all sandboxes/CI; the built-in crawler is fine
  // for a suite this size and avoids a hard crash when its socket is missing.
  watchman: false,
};
