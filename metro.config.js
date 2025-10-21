const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Constrain Metro to a single worker to avoid Windows spawning issues
config.maxWorkers = 1;

module.exports = config;
