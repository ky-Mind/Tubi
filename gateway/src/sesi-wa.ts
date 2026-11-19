// @ts-nocheck
/* Sesi login WhatsApp (pengganti useMultiFileAuthState) yang disimpan di penyimpanan Durable Object,
   jadi tetap tersambung walau objeknya dimuat ulang atau di-deploy ulang. Semua kunci berawalan "wa:". */
import { BufferJSON, initAuthCreds, proto } from "@whiskeysockets/baileys";

const AWALAN = "wa:";
const simpan = (v) => JSON.stringify(v, BufferJSON.replacer);
const muat = (s) => (s == null ? undefined : JSON.parse(s, BufferJSON.reviver));
const potong = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

export async function sesiWA(storage) {
  const creds = muat(await storage.get(AWALAN + "creds")) || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        async get(jenis, ids) {
          const hasil = {};
          for (const bagian of potong(ids, 128)) {
            const peta = await storage.get(bagian.map((id) => `${AWALAN}${jenis}:${id}`));
            for (const id of bagian) {
              let nilai = muat(peta.get(`${AWALAN}${jenis}:${id}`));
              if (jenis === "app-state-sync-key" && nilai) nilai = proto.Message.AppStateSyncKeyData.fromObject(nilai);
              hasil[id] = nilai;
            }
          }
          return hasil;
        },
        async set(data) {
          const isi = {}, hapus = [];
          for (const jenis in data)
            for (const id in data[jenis]) {
              const k = `${AWALAN}${jenis}:${id}`, v = data[jenis][id];
              if (v) isi[k] = simpan(v); else hapus.push(k);
            }
          for (const bagian of potong(Object.entries(isi), 128)) await storage.put(Object.fromEntries(bagian));
          for (const bagian of potong(hapus, 128)) await storage.delete(bagian);
        },
      },
    },
    saveCreds: () => storage.put(AWALAN + "creds", simpan(creds)),
  };
}

/** Hapus seluruh sesi WhatsApp (setelah logout atau ganti nomor). */
export async function hapusSesiWA(storage) {
  for (;;) {
    const kunci = [...(await storage.list({ prefix: AWALAN, limit: 128 })).keys()];
    if (!kunci.length) return;
    await storage.delete(kunci);
  }
}
