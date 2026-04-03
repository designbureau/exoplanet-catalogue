import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  build: {
    outDir: 'build',
    assetsDir: 'src',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2024,
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: "src/fwdds.js",
      }
    },
  },
  server: {
    host: 'bs-local.com',
    port: 5173,
    https: true,
  },
  plugins: [glsl(), mkcert()],
});