module.exports = function (api) {
  // Cache keyed on env so the test build (no reanimated plugin) and the app
  // build (with it) don't share a cached result.
  const isTest = api.env("test");
  api.cache.using(() => process.env.NODE_ENV);
  return {
    presets: ["babel-preset-expo"],
    // The Reanimated plugin rewrites "worklet" functions for the UI-thread
    // runtime. Under Jest the domain is exercised as plain JS (the whole point
    // of keeping it pure), so the plugin is skipped and "worklet" directives
    // are harmless no-op strings.
    plugins: isTest ? [] : ["react-native-reanimated/plugin"],
  };
};
