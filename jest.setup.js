/* global jest */

jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
    require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(() => Promise.resolve('test-image.png')),
  releaseCapture: jest.fn(),
}));

jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: jest.fn(() =>
    Promise.resolve({filePath: 'test-document.pdf'}),
  ),
}));

jest.mock('react-native-webview', () => {
  const {View} = require('react-native');
  return {WebView: View};
});

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
