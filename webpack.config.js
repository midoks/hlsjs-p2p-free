const pkgJson = require('./package.json');
const path = require('path');
const webpack = require('webpack');


// console.log(webpack);
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
        comments: true,  // remove all comments
        preamble: "/* A P2P-CDN supporting hls player built on WebRTC Data Channels API. @author midoks <midoks@163.com> <https://github.com/midoks> */"
    }
};

//嵌入全局变量
function getConstantsForConfig(type) {                                             
    const buildConstants = {
        __VERSION__: JSON.stringify(pkgJson.version),
    };
    return buildConstants;
}

function getAliasesForLightDist() {
    let aliases = {};

    aliases = Object.assign({}, aliases, {
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
            new webpack.LoaderOptionsPlugin(uglifyJsOptions),
            new webpack.LoaderOptionsPlugin({
                minimize: true,
                debug: false
            })
        ]);
    }

    return plugins;
}

const commonConfig = {
    module: {
        strictExportPresence: true,
        rules: [
            {
                test: /\.(ts|js)$/,
                exclude: [
                    path.resolve(__dirname, 'node_modules')
                ],
                use: {
                    loader: 'babel-loader',
                }
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
    name: 'release',
  	mode: 'production',
    entry: './src/index.js',
    output: {
        filename: 'p2p.min.js',
    	chunkFilename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/dist/',
        library: ['Hls'],
        libraryTarget: 'umd',
        libraryExport: 'default',
        globalObject: 'this',
    },
    plugins: getPluginsForConfig(true)
	},
].map(fragment => Object.assign({}, commonConfig, fragment));


module.exports = (envArgs) => {

    const requestedConfigs = Object.keys(envArgs).filter(
        (key) => !/^WEBPACK_/.test(key)
    );
    let configs;

    configs = multiConfig;

    console.log(
    `Building configs: ${configs.map((config) => config.name).join(', ')}.\n`
    );
  return configs;
};