const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude pnpm temp build directories that Metro incorrectly tries to watch
const blockList = [
  /.*\/node_modules\/.*_tmp_.*\/.*/,
  /.*_tmp_\d+.*/,
];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...(Array.isArray(config.resolver?.blockList) ? config.resolver.blockList : []),
    ...blockList,
  ],
};

module.exports = config;
