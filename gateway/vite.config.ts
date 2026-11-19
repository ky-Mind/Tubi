import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";

const lokal = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [cloudflare()],
  resolve: {
    alias: {
      // lihat src/shim/ws.js dan alat/siapkan-bridge.mjs
      ws: lokal("./src/shim/ws.js"),
      "whatsapp-rust-bridge": lokal("./src/vendor/wa-bridge.js"),
    },
  },
});
