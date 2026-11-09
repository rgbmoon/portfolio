import { defineConfig } from '@rspack/cli'

// Bundles own code and workspace packages; every other bare import stays an external ESM import (ADR-0002).
const isExternal = (request: string): boolean =>
  !request.startsWith('.') && !request.startsWith('#') && !request.startsWith('/') && !request.startsWith('@portfolio/')

export default defineConfig({
  mode: 'production',
  target: 'node',
  entry: { main: './src/main.ts' },
  output: {
    path: new URL('./dist', import.meta.url).pathname,
    filename: '[name].js',
    module: true,
    chunkFormat: 'module',
    library: { type: 'module' },
    clean: true,
  },
  devtool: 'source-map',
  externalsType: 'module-import',
  externals: [
    ({ request }, callback) => {
      if (request !== undefined && isExternal(request)) {
        callback(undefined, request)
        return
      }
      callback()
    },
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            target: 'es2024',
            parser: { syntax: 'typescript', decorators: true },
            transform: { legacyDecorator: true, decoratorMetadata: true, useDefineForClassFields: false },
            keepClassNames: true,
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
  optimization: { minimize: false },
})
