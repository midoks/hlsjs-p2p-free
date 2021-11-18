const pkgJson = require('./package.json');
const path = require('path');
const webpack = require('webpack');

//嵌入全局变量
function getConstantsForConfig(type) {
    return {
        __VERSION__: JSON.stringify(pkgJson.version),
    };
}



function getPluginsForConfig(minify = false, type) {
    // common plugins.
    const plugins = [
        // new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.ProvidePlugin({
          process: 'process/browser',
        }),
        new webpack.optimize.ModuleConcatenationPlugin(),
        new webpack.DefinePlugin(getConstantsForConfig(type)),
    ];

    if (minify) {
        // minification plugins.
        return plugins.concat([
            // new webpack.optimize.UglifyJsPlugin(uglifyJsOptions),
            new webpack.LoaderOptionsPlugin({
                minimize: true,
                debug: true
            })
        ]);
    }

    return plugins;
}

const multiConfig = [
  {
    name: 'debug',
    mode: 'development',
    output: {
      filename: 'p2p.js',
      chunkFilename: '[name].js',
      sourceMapFilename: 'p2p.js.map',
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/dist/',
      library: 'Hls',
      libraryTarget: 'umd',
      libraryExport: 'default',
      globalObject: 'this',
    },
    plugins: getPluginsForConfig(),
    devtool: 'source-map',
  }
];
module.exports = (envArgs) => {
  const requestedConfigs = Object.keys(envArgs).filter(
    (key) => !/^WEBPACK_/.test(key)
  );
  let configs;

  configs = multiConfig;

  return configs;
};