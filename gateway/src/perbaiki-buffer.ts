// @ts-nocheck
// Bug Buffer di Cloudflare Workers: buf.utf8Write(teks, posisi) tanpa panjang menganggap sisa ruang = panjang
// seluruh buffer (bukan panjang - posisi), lalu melempar "The value of "length" is out of range".
// protobufjs (dipakai libsignal/Baileys) memanggilnya untuk teks > 40 byte, sehingga enkripsi pesan WhatsApp gagal
// ("Failed to encrypt for recipient"). Di sini panjangnya selalu diisi dengan benar.
import { Buffer } from "node:buffer";

for (const nama of ["utf8Write", "latin1Write", "asciiWrite", "hexWrite", "base64Write", "base64urlWrite", "ucs2Write"]) {
  const asli = Buffer.prototype[nama];
  if (typeof asli !== "function" || asli.__tubi) continue;
  const benar = function (teks, posisi = 0, panjang) { return asli.call(this, teks, posisi, panjang ?? this.length - posisi); };
  benar.__tubi = true;
  Buffer.prototype[nama] = benar;
}
