import { defineConfig } from "vite";
// allow reading process.env in this config without requiring @types/node
declare const process: any;
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["images/favicon.ico"],
      manifest: {
        name: "SG HIRING",
        short_name: "SG HIRING",
        description: "SG HIRING – Saber Group's recruitment and hiring platform",
        theme_color: "#E3302C",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "ar",
        icons: [
          { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa/maskable-icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/pwa/maskable-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // The old setup pre-downloaded every built file (~250 files, ~5 MB) after every
        // release, and kept serving the previous version until that finished (so users had
        // to refresh several times). Now: only the tiny icons are pre-cached; pages are
        // fetched network-first (always the newest version when online, last copy when
        // offline) and the hashed build files are cached as they are first used.
        globPatterns: ["pwa/*.png", "images/favicon.ico"],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: { mode: string } }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "pages", networkTimeoutSeconds: 4 },
          },
          {
            // File names carry a content hash, so a cached copy never goes stale.
            urlPattern: /\/assets\//,
            handler: "CacheFirst",
            options: {
              cacheName: "build-assets",
              expiration: { maxEntries: 400, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    // include visualizer only when ANALYZE=1 to avoid generating on every build
    ...(process.env.ANALYZE ? [visualizer({ filename: 'dist/stats.html', title: 'Bundle Visualizer', gzipSize: true })] : []),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return;
          if (id.includes('node_modules')) {
            const parts = id.toString().split('node_modules/')[1].split('/');
            // Handle scoped packages
            const pkg = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
            return `vendor.${pkg.replace('@', '').replace('/', '.')}`;
          }
        },
      },
    },
  },
});
