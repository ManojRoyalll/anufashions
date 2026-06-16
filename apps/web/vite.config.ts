import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["pwa-icon.svg"],
      manifest: {
        name: "Anu Fashions ERP",
        short_name: "Anu Fashions",
        description: "Retail operations for sarees and ladies wear",
        theme_color: "#C2185B",
        background_color: "#FFF8F0",
        display: "standalone",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          }
        ]
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
