import { bindings, defineConfig, exports } from "cf/config";

import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

/* Gateway WhatsApp Tubi: satu nomor WhatsApp (Baileys) di dalam Durable Object,
   membaca pesanan & chat dari Firestore project Tubi lewat REST. */
export default defineConfig(({ mode }) => ({
  worker: {
    name: "tubi-gateway",
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint,
    env: {
      APP_ENV: bindings.text(mode === "production" ? "production" : "development"),
      WA_DEVICE_NAME: bindings.text("Tubi Gateway"),
      // Isi file kunci akun layanan Firebase project tubi-app (satu baris JSON). Lokal: file .dev.vars (tidak ikut Git).
      FIREBASE_SA: bindings.secret(),
    },
    exports: {
      Gateway: exports.durableObject({ storage: "sqlite" }),
    },
  },
}));
