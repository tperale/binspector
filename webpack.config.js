const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: {
    binspector: path.resolve(__dirname, 'src') + '/index.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: ['ts-loader'],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    globalObject: 'this',
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'binspector',
  },
}
