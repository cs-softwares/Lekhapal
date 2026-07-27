const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const escapeForRegex = value =>
  value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

const pathToRegex = absolutePath => {
  const normalizedSegments = path
    .resolve(absolutePath)
    .split(path.sep)
    .filter(Boolean)
    .map(segment => escapeForRegex(segment));

  return new RegExp(`^${normalizedSegments.join('[\\\\/]')}([\\\\/].*)?$`);
};

const ignoredRoots = [
  '.bundle',
  '.git',
  '.gradle-local',
  '.gradle-user',
  '.tmp',
  'android/app/build',
  'android/build',
  'ios/build',
].map(relativePath => path.join(__dirname, relativePath));

const config = {
  resolver: {
    blockList: [
      ...ignoredRoots.map(absolutePath => pathToRegex(absolutePath)),
      /.*[\\/]node_modules[\\/].+[\\/]android[\\/]build[\\/].*/,
      /.*[\\/]node_modules[\\/].+[\\/]android[\\/]\.cxx[\\/].*/,
      /.*[\\/]node_modules[\\/].+[\\/]ios[\\/]build[\\/].*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
