const pkgJson = require('./package.json');
const path = require('path');


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