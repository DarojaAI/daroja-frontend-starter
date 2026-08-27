import { defineConfig } from 'vitest/config';
// Re-export `bundleAnalyzer` so the analyzer opt-in lives in exactly one
// place (vite.config.ts). Re-importing it from there keeps the vitest
// adapter thin and ensures any future change to the analyzer plugin
// shape flows downstream without a second edit here.
export { bundleAnalyzer } from './vite.config';

// `ANALYZE` env var is read by vite.config.ts when deciding whether to
// attach the bundle analyzer. Tests never invoke it directly, but the
// fact that the symbol is importable here means downstream CI jobs can
// import and exercise it without pulling in a second copy of vite.config.
const isAnalyze = process.env.ANALYZE === 'true';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': new URL('./src/', import.meta.url).pathname,
      '@api': new URL('./src/api/', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
  define: {
    // Mirror vite.config.ts so unit tests see the same opt-in intent.
    __STARTER_ANALYZE__: JSON.stringify(isAnalyze),
  },
});
