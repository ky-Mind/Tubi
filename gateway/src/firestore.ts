// @ts-nocheck
/* Klien Firestore lewat REST, masuk dengan akun layanan Firebase (tanpa firebase-admin, yang butuh gRPC).
   Nilai Timestamp dibaca sebagai angka milidetik. */

const SCOPE = "https://www.googleapis.com/auth/datastore";
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlTeks = (s) => b64url(new TextEncoder().encode(s));

// ---------- Konversi nilai ----------
export function keNilai(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(keNilai) } };
  return { mapValue: { fields: keFields(v) } };
}
export const keFields = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, keNilai(v)]));

export function dariNilai(v) {
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return Date.parse(v.timestampValue);
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(dariNilai);
  if ("mapValue" in v) return dariFields(v.mapValue.fields);
  if ("geoPointValue" in v) return { lat: v.geoPointValue.latitude, lng: v.geoPointValue.longitude };
  if ("referenceValue" in v) return v.referenceValue;
  if ("bytesValue" in v) return v.bytesValue;
  return null;
}
export const dariFields = (f = {}) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, dariNilai(v)]));
const dariDok = (d) => ({ id: d.name.split("/").pop(), ...dariFields(d.fields) });

// Jalur field Firestore: bagian yang bukan identifier sederhana harus diberi backtick.
const jalurField = (k) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : "`" + k.replace(/`/g, "\\`") + "`");

export class Firestore {
  constructor(saJson) {
    this.sa = JSON.parse(saJson);
    this.proyek = this.sa.project_id;
    this.akar = `projects/${this.proyek}/databases/(default)/documents`;
    this.dasar = `https://firestore.googleapis.com/v1/${this.akar}`;
    this.token = null;
    this.kedaluwarsa = 0;
  }

  async #akses() {
    if (this.token && Date.now() < this.kedaluwarsa - 60_000) return this.token;
    const kini = Math.floor(Date.now() / 1000);
    const kepala = b64urlTeks(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const isi = b64urlTeks(JSON.stringify({ iss: this.sa.client_email, scope: SCOPE, aud: this.sa.token_uri || "https://oauth2.googleapis.com/token", iat: kini, exp: kini + 3600 }));
    const pem = this.sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    const kunci = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const ttd = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kunci, new TextEncoder().encode(`${kepala}.${isi}`));
    const r = await fetch(this.sa.token_uri || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${kepala}.${isi}.${b64url(ttd)}` }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`Login Firebase gagal: ${j.error_description || j.error || r.status}`);
    this.token = j.access_token;
    this.kedaluwarsa = Date.now() + j.expires_in * 1000;
    return this.token;
  }

  async #panggil(url, init = {}) {
    const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${await this.#akses()}`, "Content-Type": "application/json", ...init.headers } });
    if (r.status === 404) return null;
    const j = await r.json();
    if (!r.ok) throw new Error(`Firestore ${r.status}: ${j.error?.message || JSON.stringify(j)}`);
    return j;
  }

  /** Satu dokumen, atau null bila tidak ada. */
  async ambil(jalur) {
    const d = await this.#panggil(`${this.dasar}/${jalur}`);
    return d ? dariDok(d) : null;
  }

  /** Semua dokumen di satu koleksi (untuk koleksi kecil seperti admins). */
  async daftar(koleksi) {
    const out = [];
    let halaman = "";
    do {
      const j = await this.#panggil(`${this.dasar}/${koleksi}?pageSize=300${halaman ? `&pageToken=${halaman}` : ""}`);
      out.push(...(j?.documents || []).map(dariDok));
      halaman = j?.nextPageToken || "";
    } while (halaman);
    return out;
  }

  /** Dokumen di `koleksi` yang `field` (Timestamp) > `sejakMs`, urut naik. */
  async sejak(koleksi, field, sejakMs, batas = 50) {
    const j = await this.#panggil(`${this.dasar}:runQuery`, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: koleksi }],
          where: { fieldFilter: { field: { fieldPath: field }, op: "GREATER_THAN", value: { timestampValue: new Date(sejakMs).toISOString() } } },
          orderBy: [{ field: { fieldPath: field }, direction: "ASCENDING" }],
          limit: batas,
        },
      }),
    });
    return (j || []).filter((x) => x.document).map((x) => dariDok(x.document));
  }

  /** Seperti set(..., { merge: true }). `waktuServer` = daftar field yang diisi waktu server. */
  async gabung(jalur, data, waktuServer = []) {
    const fields = keFields(data);
    const tulis = {
      update: { name: `${this.akar}/${jalur}`, fields },
      updateMask: { fieldPaths: Object.keys(fields).map(jalurField) },
      updateTransforms: waktuServer.map((f) => ({ fieldPath: jalurField(f), setToServerValue: "REQUEST_TIME" })),
    };
    await this.#panggil(`${this.dasar}:commit`, { method: "POST", body: JSON.stringify({ writes: [tulis] }) });
  }
}
