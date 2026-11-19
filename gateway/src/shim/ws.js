// Pengganti paket "ws" untuk Cloudflare Workers. Baileys hanya memakai sisi klien:
// new WebSocket(url, { origin, headers }), .on(event), .send(data, cb), .close(), readyState.
// Di Workers koneksi WebSocket keluar dibuka lewat fetch() + header Upgrade supaya header Origin bisa diisi.
import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';

export default class WebSocket extends EventEmitter {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url, opts = {}) {
    super();
    this.readyState = WebSocket.CONNECTING;
    this.ws = null;
    this.#buka(String(url), opts).catch(e => this.#gagal(e));
  }

  async #buka(url, opts) {
    const headers = new Headers(opts.headers || {});
    headers.set('Upgrade', 'websocket');
    if (opts.origin) headers.set('Origin', opts.origin);
    // Batas waktu hanya untuk jabat tangan: setelah tersambung, sinyal abort tidak boleh ikut memutus WebSocket.
    const henti = new AbortController();
    const pewaktu = opts.handshakeTimeout ? setTimeout(() => henti.abort(new Error('Batas waktu jabat tangan WebSocket')), opts.handshakeTimeout) : null;
    let res;
    try { res = await fetch(url.replace(/^ws/, 'http'), { headers, signal: henti.signal }); }
    finally { clearTimeout(pewaktu); }
    const ws = res.webSocket;
    if (!ws) {
      this.emit('unexpected-response', null, res);
      throw new Error(`WebSocket ditolak server: HTTP ${res.status}`);
    }
    try { ws.binaryType = 'arraybuffer'; } catch {}
    ws.accept();
    this.ws = ws;
    // Pesan diproses berurutan; data biner bisa datang sebagai Blob, jadi diubah dulu ke Buffer.
    let antre = Promise.resolve();
    ws.addEventListener('message', ev => {
      const d = ev.data;
      antre = antre.then(async () => {
        const isi = typeof d === 'string' ? Buffer.from(d) : Buffer.from(d instanceof Blob ? await d.arrayBuffer() : d);
        this.emit('message', isi, typeof d === 'string');
      }).catch(e => this.emit('error', e));
    });
    ws.addEventListener('close', ev => this.#tutup(ev.code, ev.reason));
    ws.addEventListener('error', ev => this.emit('error', ev.error || new Error('WebSocket error')));
    this.readyState = WebSocket.OPEN;
    this.emit('open');
  }

  #gagal(e) {
    this.emit('error', e);
    this.#tutup(1006, String(e?.message || e));
  }

  #tutup(code, reason) {
    if (this.readyState === WebSocket.CLOSED) return;
    this.readyState = WebSocket.CLOSED;
    this.emit('close', code, Buffer.from(reason || ''));
  }

  send(data, cb) {
    try {
      if (this.readyState !== WebSocket.OPEN) throw new Error('WebSocket belum terbuka');
      this.ws.send(data);
      cb?.();
    } catch (e) {
      if (cb) cb(e); else this.emit('error', e);
    }
  }

  close(code = 1000, reason) {
    if (this.readyState >= WebSocket.CLOSING) return;
    this.readyState = WebSocket.CLOSING;
    try { this.ws?.close(code, reason); } catch {}
    this.#tutup(code, reason);
  }

  terminate() { this.close(); }
  ping() {}
  pong() {}
}
export { WebSocket };
