const path = require('path'),
  // https://webpack.js.org/plugins/terser-webpack-plugin/#root
  TerserWebpackPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: {
    client: './src/index.js',
  },

  devtool: 'eval-source-map',

  // https://webpack.js.org/configuration/dev-server/
  devServer: {
    compress: true,
    contentBase: __dirname, // path.join(__dirname, 'build'),
    // host: '0.0.0.0',
    hot: true, // https://webpack.js.org/configuration/dev-server/#devserver-hot
    inline: true,
    port: 9001,
    publicPath: '/', // https://webpack.js.org/configuration/dev-server/#devserver-publicpath-
  },

  externals: {}, // https://webpack.js.org/configuration/externals/

  mode: 'development', // 'development' or 'production'. $webpack --mode=development

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
        },
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
      },
    ],
  },

  optimization: {
    minimize: false,
    minimizer: [
      // https://webpack.js.org/plugins/terser-webpack-plugin
      new TerserWebpackPlugin({
        cache: false,
        parallel: true,
        sourceMap: false,
        terserOptions: {
          warnings: true,
          compress: {
            dead_code: false,
            drop_console: false,
            drop_debugger: false,
            unused: false,
            warnings: false,
          },
          mangle: false,
        },
      }),
    ],
  },

  output: {
    filename: '[name].js',
    // chunkFilename: '[name].js',
    path: path.resolve(__dirname, 'build'),
    // publicPath: ''
  },

  plugins: [],
};
