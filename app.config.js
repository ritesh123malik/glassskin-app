module.exports = ({ config }) => {
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  const isProduction = buildProfile === 'production';

  return {
    ...config,
    ios: {
      ...(config.ios || {}),
      entitlements: {
        ...((config.ios && config.ios.entitlements) || {}),
        'aps-environment': isProduction ? 'production' : 'development',
      },
    },
  };
};
