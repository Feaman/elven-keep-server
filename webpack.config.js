const path = require('path')

module.exports = {
  mode: 'production',
  target: 'node',
  entry: {
    api: './src/api.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '~': path.resolve(__dirname, './src')
    }
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './dist')
  }
}
