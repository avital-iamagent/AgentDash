import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

const certDir = path.resolve(__dirname, ".certs");
const certPath = path.join(certDir, "cert.pem");
const keyPath = path.join(certDir, "key.pem");
const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

const httpsConfig = hasCerts
  ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
  : undefined;

const backendProto = hasCerts ? "https" : "http";
const wsProto = hasCerts ? "wss" : "ws";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    https: httpsConfig,
    proxy: {
      "/api": {
        target: `${backendProto}://localhost:3001`,
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: `${wsProto}://localhost:3001`,
        ws: true,
        rewriteWsOrigin: true,
        secure: false,
      },
    },
  },
});
