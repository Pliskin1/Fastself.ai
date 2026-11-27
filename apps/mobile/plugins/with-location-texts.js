const { withInfoPlist } = require('expo/config-plugins');

// expo-location always writes a generic English text for the temporary full accuracy prompt. The app never asks
// for full accuracy, but App Review reads every purpose string, so it gets the same Montenegrin text.
module.exports = function withLocationTexts(config, { text }) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSLocationTemporaryUsageDescriptionDictionary = { ExpoLocationFullAccuracy: text };
    return cfg;
  });
};
