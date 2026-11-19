// Cloudflare melarang WebAssembly dikompilasi dari byte saat jalan (new WebAssembly.Module(bytes)).
// whatsapp-rust-bridge (dipakai Baileys) menyimpan WASM-nya sebagai base64 di dalam JS, jadi
// skrip ini mengeluarkan WASM-nya ke file .wasm dan menulis versi JS yang meng-import file itu.
import fs from 'node:fs';
import path from 'node:path';

const asal = path.resolve('node_modules/whatsapp-rust-bridge/dist/index.js');
const tujuan = path.resolve('src/vendor');
const js = fs.readFileSync(asal, 'utf8');

const awal = js.indexOf('var forceNoSimd');
const akhir = js.indexOf('var __wasmSimdActive');
if (awal < 0 || akhir < 0) throw new Error('Format whatsapp-rust-bridge berubah; periksa alat/siapkan-bridge.mjs');
const blok = js.slice(awal, akhir);
// Ambil WASM tanpa SIMD (literal base64 terakhir di blok init) supaya aman di semua runtime.
const semua = [...blok.matchAll(/"(AGFzbQ[A-Za-z0-9+/=]+)"/g)].map(m => m[1]);
if (!semua.length) throw new Error('WASM base64 tidak ditemukan');
const wasm = Buffer.from(semua[semua.length - 1], 'base64');

fs.mkdirSync(tujuan, { recursive: true });
fs.writeFileSync(path.join(tujuan, 'wa-bridge.wasm'), wasm);
const baru = 'import __wasmModule from "./wa-bridge.wasm";\n' +
  js.slice(0, awal) +
  'initSync({ module: __wasmModule });\nvar simdUsed = false;\n' +
  js.slice(akhir);
fs.writeFileSync(path.join(tujuan, 'wa-bridge.js'), baru);
console.log(`wa-bridge siap (${(wasm.length / 1024).toFixed(0)} KB WASM)`);
