const appJson = require('./app.json');

module.exports = () => {
  const config = appJson.expo;

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      ...config.android,
      ...(process.env.GOOGLE_MAPS_API_KEY
        ? {
            config: {
              googleMaps: {
                apiKey: process.env.GOOGLE_MAPS_API_KEY,
              },
            },
          }
        : {}),
    },
  };
};
