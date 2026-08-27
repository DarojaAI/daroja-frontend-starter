import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// NOTE: These alias and build paths are part of the canonical starter
// contract (plan §8.1). Downstream projects may extend them, but the
// base paths below are locked so cross-repo expectations (e.g. "/" -> src,
// "/@src" -> src, "/@api" -> src/api) keep working unchanged.
export const STARTER_ALIASES = {
  '@': '/src',
  '@api': '/src/api',
} as const;

export const STARTER_SOURCEMAP = true as const;

/**
 * Opt-in bundle analyzer. NOT enabled by default — pass `--mode analyze`
 * (or set `ANALYZE=true` in the env) to write `dist/stats.html` on build.
 * Returns the visualizer plugin configured for the canonical starter
 * output path so downstream projects get a comparable bundle baseline.
 */
export function bundleAnalyzer(): UserConfig['plugins'][number] {
  return visualizer({
    filename: 'dist/stats.html',
    gzipSize: true,
    brotliSize: true,
    template: 'treemap',
  });
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    // Only attach the analyzer when explicitly opted in. `mode === 'analyze'`
    // is the canonical escape hatch; `ANALYZE=true` is the env-driven
    //   override for CI / scripted runs.
    ...(mode === 'analyze' || process.env.ANALYZE === 'true'
      ? [bundleAnalyzer()]
      : []),
  ],
  resolve: {
    alias: {
      ...STARTER_ALIASES,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/a2a': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/.well-known': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: STARTER_SOURCEMAP,
    chunkSizeWarningLimit: 1000,
  },
  appType: 'spa',
}));
