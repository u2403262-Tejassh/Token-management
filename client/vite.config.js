// Vite configuration with proxy to backend and local network host enabled.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Allow Vercel/E2B preview hosts (e.g. 5173-xxxx.e2b.app)
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
