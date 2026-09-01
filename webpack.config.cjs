const path = require('path');

const isApp = process.env.BUILD_APP === '1';
const isProduction = process.env.NODE_ENV === 'production' && !isApp;

const config = {
  entry: isProduction ? './src/index.tsx' : './src/demo/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction ? 'index.js' : 'main.js',
    clean: isApp,
    libraryTarget: isProduction ? 'umd' : undefined,
    library: isProduction ? 'WeaveAiChat' : undefined,
    umdNamedDefine: isProduction,
    globalObject: isProduction ? 'this' : undefined
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  'tailwindcss',
                  'autoprefixer',
                ]
              }
            }
          }
        ]
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              typescript: true,
              dimensions: false,
              svgo: true,
              svgoConfig: {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        removeViewBox: false,
                        removeUselessStrokeAndFill: false,
                        removeUnknownsAndDefaults: false,
                        cleanupIDs: false
                      }
                    }
                  }
                ]
              }
            }
          }
        ]
      },
    ]
  },
  externals: isProduction ? {
    react: {
      commonjs: 'react',
      commonjs2: 'react',
      amd: 'React',
      root: 'React'
    },
    'react-dom': {
      commonjs: 'react-dom',
      commonjs2: 'react-dom',
      amd: 'ReactDOM',
      root: 'ReactDOM'
    }
  } : {},
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 8081,
    hot: true,
    open: true
  }
};

module.exports = config;
