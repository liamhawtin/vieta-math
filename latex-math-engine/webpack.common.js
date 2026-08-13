// @flow
const path = require('path');
// $FlowIgnore
const TerserPlugin = require('terser-webpack-plugin');
// $FlowIgnore
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const {version} = require("./package.json");

const targets /*: Array<Target> */ = [
    {
        name: 'latex-math-engine',
        entry: './katex.webpack.js',
        library: 'latexMathEngine',
    }
];

function createConfig(target /*: Target */, dev /*: boolean */,
        minimize /*: boolean */) /*: Object */ {
    const cssLoaders /*: Array<Object> */ = [{
        loader: 'css-loader',
        options: {importLoaders: 1},
    }, {
        loader: 'postcss-loader',
        // $FlowIgnore
        options: {postcssOptions: {plugins: [require('postcss-preset-env')()]}},
    }];
    if (minimize) {
        // $FlowIgnore
        cssLoaders[1].options.postcssOptions.plugins.push(require('cssnano')());
    }

    let sassVariables = `$version: "${version}";\n`;

    return {
        mode: dev ? 'development' : 'production',
        context: __dirname,
        entry: {
            [target.name]: target.entry,
        },
        output: {
            filename: minimize ? '[name].min.js' : '[name].js',
            library: target.library,
            libraryTarget: 'umd',
            libraryExport: 'default',
            // Enable output modules to be used in browser or Node.
            // See: https://github.com/webpack/webpack/issues/6522
            // https://github.com/webpack/webpack/pull/11987
            globalObject: "(typeof self !== 'undefined' ? self : this)",
            path: path.resolve(__dirname, 'dist'),
            publicPath: dev ? '/' : '',
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: 'babel-loader',
                },
                {
                    test: /\.css$/,
                    use: [
                        dev ? 'style-loader' : MiniCssExtractPlugin.loader,
                        ...cssLoaders,
                    ],
                },
                {
                    test: /\.scss$/,
                    use: [
                        dev ? 'style-loader' : MiniCssExtractPlugin.loader,
                        ...cssLoaders,
                        {
                            loader: 'sass-loader',
                            options: {
                                sassOptions: {
                                    outputStyle: 'expanded',
                                },
                                additionalData: sassVariables,
                            },
                        },
                    ],
                },
            ],
        },
        externals: 'katex',
        plugins: [
            !dev && new MiniCssExtractPlugin({
                filename: minimize ? '[name].min.css' : '[name].css',
            }),
        ].filter(Boolean),
        devtool: dev && 'inline-source-map',
        optimization: {
            minimize,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        output: {
                            ascii_only: true,
                        },
                    },
                }),
            ],
        },
        performance: {
            hints: false,
        },
        stats: {
            colors: true,
        },
    };
}

module.exports = {
    targets,
    createConfig,
};
