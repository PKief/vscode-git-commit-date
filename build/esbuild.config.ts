import type { BuildOptions } from 'esbuild';

const config: BuildOptions = {
  entryPoints: [
    './src/extension.ts',
  ],
  minify: true,
  bundle: true,
  platform: 'node',
  metafile: false,
  target: 'node16',
  outdir: './dist',
  outbase: './src',
  outExtension: {
    '.js': '.js',
  },
  format: 'esm',
  external: ['vscode'],
  loader: {
    '.ts': 'ts',
    '.js': 'js',
  },
  logLevel: 'info',
};

export default config;
