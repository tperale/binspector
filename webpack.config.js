const path = require('path')

module.exports = {
  entry: path.resolve(__dirname, 'src') + '/index.ts',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'parser.js',
    library: {
      name: '@sport-files/parser',
      type: 'umd'
    }
  }
}
