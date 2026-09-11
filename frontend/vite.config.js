import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "fix-simli-client-case",
      resolveId(source, importer) {
        if (source === "./Client" && importer && importer.includes("simli-client")) {
          return this.resolve("./client.js", importer, { skipSelf: true });
        }
        return null;
      },
    },
  ],
  resolve: {
    alias: {
      // simli-client npm package contains a case-sensitivity mismatch in dist/index.js
      // (require("./Client") instead of "./client") which fails on case-sensitive Linux filesystems.
      "simli-client": "simli-client/dist/client.js",
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
