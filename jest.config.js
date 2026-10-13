module.exports = {
  resolver: 'react-native-worklets/jest/resolver',
  preset: '@react-native/jest-preset',
  watchman: false,
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community|-async-storage)?|@react-navigation|react-native-(drawer-layout|gesture-handler|reanimated|worklets|safe-area-context|screens|linear-gradient|vector-icons|webview|share|view-shot|html-to-pdf|url-polyfill)|@supabase)/)',
  ],
};
