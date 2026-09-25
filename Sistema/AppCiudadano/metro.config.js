const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  config.resolver.platforms = ['android', 'ios', 'native', 'web'];
  return config;
})();