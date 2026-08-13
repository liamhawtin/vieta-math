const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const mode = process.env?.MODE || argv.mode || 'development';
  const isDev = mode === 'development';
  const isModule = Boolean(env?.module);

  return {
    mode,
    entry: {
      'index': './src/index.js',
      'vieta-math-prosemirror': './src/integrations/index.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isModule ? '[name].mjs' : '[name].js',
      library: isModule ? { type: 'module' } : {
        name: 'VietaMath',
        type: 'umd'
      },
      globalObject: 'this',
      clean: !isModule
    },
    devtool: isDev ? 'source-map' : false,

    externalsType: isModule ? 'module' : 'var',
    externals: ({ request }, callback) => {
      if (isModule && ['react', 'react-dom', 'react-dom/client', 'vieta-math'].includes(request)) {
        return callback(null, request);
      }

      // React externals (both bundles)
      if (request === 'react') {
        return callback(null, {
          commonjs: 'react',
          commonjs2: 'react',
          amd: 'react',
          root: 'React'
        });
      }

      if (request === 'react-dom') {
        return callback(null, {
          commonjs: 'react-dom',
          commonjs2: 'react-dom',
          amd: 'react-dom',
          root: 'ReactDOM'
        });
      }

      if (request === 'react-dom/client') {
        return callback(null, {
          commonjs: 'react-dom/client',
          commonjs2: 'react-dom/client',
          amd: 'react-dom/client',
          root: 'ReactDOM'
        });
      }

      // Core as external ONLY for prosemirror entry
      if (request === 'vieta-math') {
        return callback(null, {
          commonjs: 'vieta-math',
          commonjs2: 'vieta-math',
          amd: 'vieta-math',
          root: 'VietaMath'
        });
      }

      callback();
    },

    module: {
      rules: [
        { test: /\.json$/, type: 'json' },
        {
          test: /\.(js|jsx)$/,
          exclude: /(node_modules|latex-math-engine)/,
          use: { loader: 'babel-loader' }
        },
        {
          test: /\.scss$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'sass-loader',
              options: { api: 'modern-compiler', implementation: require('sass-embedded') }
            }
          ]
        },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        {
          test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
          type: 'asset/inline'
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name][ext]'
          }
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@stores': path.resolve(__dirname, 'src/stores'),
        '@styles': path.resolve(__dirname, 'src/styles'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@constants': path.resolve(__dirname, 'src/constants'),
        '@assets': path.resolve(__dirname, 'src/assets'),
        '@data': path.resolve(__dirname, 'data'),
        lme: path.resolve(__dirname, 'latex-math-engine/dist/latex-math-engine.js'),
      }
    },

    optimization: {
      minimize: !isDev,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: { drop_console: true, drop_debugger: true },
            format: { comments: false },
          },
          extractComments: false,
        }),
      ],
    },

    experiments: isModule ? { outputModule: true } : {},

    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/types/index.d.ts', to: 'index.d.ts' },
          { from: 'src/types/prosemirror.d.ts', to: 'vieta-math-prosemirror.d.ts' }
        ]
      })
    ]
  };
};
