const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
        util: require.resolve('util/'),
        vm: require.resolve('vm-browserify')
      };

      config.plugins = [
        ...(config.plugins || []),
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser'
        })
      ];

      return config;
    }
  }
};
