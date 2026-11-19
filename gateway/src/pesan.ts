// @ts-nocheck
/* Teks WhatsApp yang dikirim gateway Tubi. */

export const digits = (v) => String(v || "").replace(/\D/g, "");
export const normPhone = (v) => {
  let n = digits(v);
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return n;
};
const rupiah = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);
const kode = (d) => "#" + d.id.slice(0, 6).toUpperCase();
const daftarItem = (d) => (d.items || []).map((i) => `• ${i.qty}x ${i.name}`).join("\n");

const TEKS_STATUS = {
  diproses: "👨‍🍳 Pesanan kamu sedang *diproses*.",
  siap: "✅ Pesanan kamu sudah *siap*.",
  selesai: "🎉 Pesanan *selesai*. Terima kasih! Jangan lupa beri rating di aplikasi Tubi ya.",
  dibatalkan: "❌ Pesanan kamu *dibatalkan*.",
};

export const PESAN_TES = "✅ Tes dari Tubi WhatsApp Gateway berhasil.";

export function pesanOrderBaru(d) {
  const bayar = d.payment?.method === "transfer"
    ? `Transfer${d.payment?.status === "paid" ? " (lunas)" : " (cek bukti bayar di dashboard)"}`
    : "COD (bayar di tempat)";
  const peta = d.location?.lat ? `https://www.google.com/maps/dir/?api=1&destination=${d.location.lat},${d.location.lng}` : "";
  return `🛒 *Pesanan baru* ${kode(d)}\n${d.recipientName || d.customerName || "Pelanggan"}\n📞 ${d.phone || "-"}\n📍 ${d.address || "-"}` +
    (peta ? `\n🧭 ${peta}` : "") +
    `\n\n${daftarItem(d)}\n\nTotal: *${rupiah(d.total)}*\nBayar: ${bayar}` +
    (d.note ? `\nCatatan: ${d.note}` : "");
}

export function pesanUntukPelanggan(d) {
  return `Halo ${d.recipientName || ""}! 👋\nPesanan kamu di *Tubi* sudah kami terima.\n\n${daftarItem(d)}\n\nTotal: *${rupiah(d.total)}*\nKami kabari lagi saat pesanan diproses.`;
}

export function pesanStatus(d) {
  const t = TEKS_STATUS[d.status];
  return t ? `*Tubi* — pesanan ${kode(d)}\n${t}` : null;
}

export function pesanChat(d) {
  return `💬 *Chat baru* dari ${d.name || "Pelanggan"}:\n${d.lastMessage || ""}\n\nBalas lewat Dashboard Admin → Chat.`;
}
