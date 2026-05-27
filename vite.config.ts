import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Localhost-only by default. Pass --host on the CLI when you specifically
    // need LAN access (e.g. testing on a phone over Wi-Fi); exposing the dev
    // server widens the surface for any future dev-server CVEs.
  },
  preview: {
    port: 4173,
  },
});
