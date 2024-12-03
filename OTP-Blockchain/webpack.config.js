const path = require('path');

module.exports = {
  // other Webpack config here (entry, output, etc.)

  devtool: 'source-map', // Enable source maps for your code if needed

  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
    },
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: [
          /node_modules\/@truffle/,
          /node_modules\/web3/
        ],
      },
      {
        test: /\.json$/,
        use: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'assets/contracts/',
        },
      },
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
};