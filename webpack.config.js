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

function getConstantsForConfig(type) {                                             //嵌入全局变量
    return {
        __VERSION__: JSON.stringify(pkgJson.version),
    };
}

function getAliasesForLightDist() {
    let aliases = {};

    aliases = Object.assign({}, aliases, {
        './bittorrent': './empty.js'
    });


    return aliases;
}

function getPluginsForConfig(minify = false, type) {
    // common plugins.
    const plugins = [
        // new webpack.optimize.OccurrenceOrderPlugin(),
        // new webpack.optimize.ModuleConcatenationPlugin(),
        new webpack.DefinePlugin(getConstantsForConfig(type))
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

const commonConfig = {

    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [
                    path.resolve(__dirname, 'node_modules')
                ]
            }
        ]
    }
};

const multiConfig = [
  {
    name: 'debug',
    mode: 'development',
    entry:"./src/index.js",
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
  },
  {
  	mode: 'production',
    name: 'release',
    entry: './src/index.js',
    output: {
    	chunkFilename: '[name].js',
        filename: 'p2p.min.js',
        path: path.resolve(__dirname, 'dist'),
        // publicPath: '/src/',
        library: ['Hls'],
        libraryTarget: 'umd'
    },
    plugins: getPluginsForConfig(true)
	},
].map(fragment => Object.assign({}, commonConfig, fragment));;
module.exports = (envArgs) => {
  const requestedConfigs = Object.keys(envArgs).filter(
    (key) => !/^WEBPACK_/.test(key)
  );
  let configs;

  configs = multiConfig;

  return configs;
};