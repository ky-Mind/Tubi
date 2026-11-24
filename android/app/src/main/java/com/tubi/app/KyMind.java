package com.tubi.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.text.style.TypefaceSpan;
import android.view.Gravity;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Bagian bersama aplikasi KyMind (sama dengan Kurama dan pucupucu):
 *  - tulisan "KyMind" di bawah layar pembuka ("Ky" tebal, "Mind" miring serif)
 *  - pembaruan langsung: APK diunduh di dalam aplikasi lalu layar pasang Android dibuka (tanpa browser / halaman GitHub)
 */
final class KyMind {
    private KyMind() {}

    /** Tulisan "KyMind" untuk layar pembuka */
    static TextView teks(Context c, boolean gelap) {
        TextView t = new TextView(c);
        SpannableString ky = new SpannableString("KyMind");
        ky.setSpan(new StyleSpan(Typeface.BOLD), 0, 2, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        ky.setSpan(new StyleSpan(Typeface.ITALIC), 2, 6, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        ky.setSpan(new TypefaceSpan("serif"), 2, 6, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        t.setText(ky);
        t.setTextSize(17);
        t.setLetterSpacing(0.02f);
        t.setTextColor(gelap ? 0xFFE8E6DC : 0xFF3D3D3A);
        t.setAlpha(.85f);   /* langsung terlihat (layar pembuka bisa cepat tertutup) */
        return t;
    }

    /** Posisi tulisan: tengah bawah, 56dp dari tepi bawah */
    static FrameLayout.LayoutParams posisi(Context c) {
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-2, -2, Gravity.CENTER_HORIZONTAL | Gravity.BOTTOM);
        lp.bottomMargin = Math.round(56 * c.getResources().getDisplayMetrics().density);
        return lp;
    }

    interface Kemajuan { void persen(int p); }

    /** Unduh APK ke folder cache aplikasi (ikut pengalihan GitHub → server berkas). Dipanggil dari thread latar. */
    static File unduhApk(String url, File dir, String nama, Kemajuan k) throws Exception {
        dir.mkdirs();
        File f = new File(dir, nama);
        String u = url;
        HttpURLConnection h = null;
        for (int i = 0; i < 6; i++) {   /* ikuti pengalihan sendiri, termasuk yang pindah host */
            h = (HttpURLConnection) new URL(u).openConnection();
            h.setInstanceFollowRedirects(false);
            h.setConnectTimeout(20000);
            h.setReadTimeout(60000);
            h.setRequestProperty("User-Agent", "KyMind-Android");
            int kode = h.getResponseCode();
            if (kode >= 300 && kode < 400 && h.getHeaderField("Location") != null) {
                u = new URL(new URL(u), h.getHeaderField("Location")).toString();
                h.disconnect();
                continue;
            }
            if (kode != 200) throw new Exception("HTTP " + kode);
            break;
        }
        long total = h.getContentLengthLong(), sudah = 0;
        int terakhir = -1;
        try (InputStream in = h.getInputStream(); FileOutputStream out = new FileOutputStream(f)) {
            byte[] b = new byte[32768];
            int n;
            while ((n = in.read(b)) > 0) {
                out.write(b, 0, n);
                sudah += n;
                int p = total > 0 ? (int) (sudah * 100 / total) : 0;
                if (k != null && p != terakhir) { terakhir = p; k.persen(Math.min(p, 99)); }
            }
        } finally { h.disconnect(); }
        if (total > 0 && sudah < total) throw new Exception("unduhan terputus");
        return f;
    }

    /** Boleh memasang APK? Bila belum, buka pengaturan "pasang aplikasi tak dikenal" lalu kembalikan false. */
    static boolean bolehPasang(Activity a, int kodeMinta) {
        if (Build.VERSION.SDK_INT < 26 || a.getPackageManager().canRequestPackageInstalls()) return true;
        Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.getPackageName()));
        if (kodeMinta >= 0) a.startActivityForResult(i, kodeMinta); else a.startActivity(i);
        return false;
    }

    /** Buka layar pasang Android untuk APK yang sudah diunduh */
    static void pasangApk(Context c, File f, String otoritas) {
        Uri u = FileProvider.getUriForFile(c, otoritas, f);
        c.startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(u, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    /** "2.6.10" lebih baru dari "2.6.9"? */
    static boolean lebihBaru(String a, String b) {
        String[] x = a.replaceAll("[^0-9.]", "").split("\\."), y = b.replaceAll("[^0-9.]", "").split("\\.");
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            int p = i < x.length && !x[i].isEmpty() ? Integer.parseInt(x[i]) : 0;
            int q = i < y.length && !y[i].isEmpty() ? Integer.parseInt(y[i]) : 0;
            if (p != q) return p > q;
        }
        return false;
    }
}
