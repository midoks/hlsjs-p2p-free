const pkgJson = require('./package.json');
const path = require('path');
const webpack = require('webpack');

const uglifyJsOptions = {
    screwIE8: true,
    stats: true,
    compress: {
        warnings: false,
        drop_debugger: true,
        drop_console: true
    },
    mangle: {
        toplevel: true,
        eval: true
    },
    output: {
        comments: false,  // remove all comments
        preamble: "/* A P2P-CDN supporting hls player built on WebRTC Data Channels API. @author XieTing <86755838@qq.com> <https://github.com/snowinszu> */"
    }
};

//嵌入全局变量
function getConstantsForConfig(type) {
    return {
        __VERSION__: JSON.stringify(pkgJson.version),
    };
}

// console.log(webpack)
function getPluginsForConfig(minify = false, type) {
    // common plugins.
    const plugins = [
        new webpack.ProvidePlugin({
          process: 'process/browser',
        }),
        new webpack.optimize.ModuleConcatenationPlugin(),
        new webpack.DefinePlugin(getConstantsForConfig(type)),
    ];

    if (minify) {
        // minification plugins.
        return plugins.concat([
            new webpack.LoaderOptionsPlugin({
                minimize: true,
                debug: false
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
  // ,
  // {
  //   name: 'prod',
  //   mode: 'production',
  //   output: {
  //     filename: 'p2p.min.js',
  //     chunkFilename: '[name].js',
  //     sourceMapFilename: 'p2p.min.js.map',
  //     path: path.resolve(__dirname, 'dist'),
  //     publicPath: '/dist/',
  //     library: 'Hls',
  //     libraryTarget: 'umd',
  //     libraryExport: 'default',
  //     globalObject: 'this',
  //   },
  //   plugins: getPluginsForConfig(true),
  //   devtool: 'source-map',
  // }
];
module.exports = (envArgs) => {
  const requestedConfigs = Object.keys(envArgs).filter(
    (key) => !/^WEBPACK_/.test(key)
  );
  let configs;

  configs = multiConfig;

  configs["configureWebpack"] = {
    //关闭 webpack 的性能提示
    performance: {
        hints:false
    }
  }

  return configs;
};