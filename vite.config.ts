import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const src = (p: string): string => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

/**
 * `VITE_SITE_BASE` exists because the same bundle ships to two hosts:
 *   - GitHub Pages project site -> /bryce-k-meyers-do/
 *   - Render (root domain)      -> /
 * Default "/" keeps docker/Render and `vite preview` working with no env at all.
 */
export default defineConfig({
  base: process.env.VITE_SITE_BASE ?? '/',
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@domain': src('domain'),
      '@application': src('application'),
      '@infrastructure': src('infrastructure'),
      '@presentation': src('presentation'),
      '@styles': src('styles'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
  },
});
