import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  // Static files are served from dist/ only; the render bundle does not need a copy.
  publicDir: isSsrBuild ? false : 'public',
  build: {
    // dist/.vite/manifest.json: the server preloads the chunks a page needs (template, landing).
    manifest: true,
  },
  // `vite build --ssr`: the server render bundle (dist-ssr) carries React and the app itself,
  // because the production image installs only the server's own dependencies.
  ssr: {
    noExternal: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
}));
