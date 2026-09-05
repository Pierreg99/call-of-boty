import { defineConfig } from 'vite';

export default defineConfig({
  base: '/call-of-boty/',
  server: {
    host: true,
    port: 5174,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
