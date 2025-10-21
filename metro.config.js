const os = require('os');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.maxWorkers = Math.max(1, Math.min(4, os.cpus().length - 1));

module.exports = config;
