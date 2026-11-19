package com.tubi.app;

import android.app.DownloadManager;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Pembaruan Tubi dari dalam aplikasi: unduh APK rilis terbaru (GitHub Releases) lalu buka layar "Pasang" Android.
 * JS: Capacitor.Plugins.Pembaruan.unduh({ url, versi }) + listener "progres" { persen, status }.
 */
@CapacitorPlugin(name = "Pembaruan")
public class PembaruanPlugin extends Plugin {
    private long idUnduhan = -1;
    private final Handler main = new Handler(Looper.getMainLooper());

    private boolean bolehPasang() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    @PluginMethod
    public void izin(PluginCall call) {
        JSObject r = new JSObject();
        r.put("boleh", bolehPasang());
        call.resolve(r);
    }

    /** Buka pengaturan "Izinkan dari sumber ini" khusus untuk Tubi. */
    @PluginMethod
    public void bukaIzin(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    @PluginMethod
    public void unduh(PluginCall call) {
        String url = call.getString("url");
        String versi = call.getString("versi", "baru");
        if (url == null || !url.startsWith("https://")) { call.reject("Alamat unduhan tidak valid."); return; }
        if (!bolehPasang()) {
            JSObject r = new JSObject();
            r.put("perluIzin", true);
            call.resolve(r);
            return;
        }
        try {
            File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            File[] lama = dir != null ? dir.listFiles() : null;
            if (lama != null) for (File f : lama) if (f.getName().endsWith(".apk")) f.delete();
            String nama = "Tubi-" + versi.replaceAll("[^0-9A-Za-z.]", "") + ".apk";
            DownloadManager dm = (DownloadManager) getContext().getSystemService(android.content.Context.DOWNLOAD_SERVICE);
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url))
                .setTitle("Pembaruan Tubi " + versi)
                .setDescription("Mengunduh versi terbaru…")
                .setMimeType("application/vnd.android.package-archive")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_DOWNLOADS, nama);
            idUnduhan = dm.enqueue(req);
            File tujuan = new File(dir, nama);
            pantau(dm, idUnduhan, tujuan);
            JSObject r = new JSObject();
            r.put("mulai", true);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Gagal memulai unduhan: " + e.getMessage());
        }
    }

    private void kirim(int persen, String status) {
        JSObject d = new JSObject();
        d.put("persen", persen);
        d.put("status", status);
        notifyListeners("progres", d);
    }

    private void pantau(DownloadManager dm, long id, File tujuan) {
        main.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (id != idUnduhan) return;
                try (Cursor c = dm.query(new DownloadManager.Query().setFilterById(id))) {
                    if (c == null || !c.moveToFirst()) { kirim(0, "gagal"); return; }
                    int st = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                    long sudah = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                    long total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                    int persen = total > 0 ? (int) (sudah * 100 / total) : 0;
                    if (st == DownloadManager.STATUS_SUCCESSFUL) { kirim(100, "selesai"); pasang(tujuan); return; }
                    if (st == DownloadManager.STATUS_FAILED) { kirim(persen, "gagal"); return; }
                    kirim(persen, "unduh");
                }
                main.postDelayed(this, 400);
            }
        }, 400);
    }

    private void pasang(File apk) {
        try {
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
            kirim(100, "gagal");
        }
    }

    /** Pasang ulang file yang sudah selesai diunduh (mis. pengguna menutup layar pasang). */
    @PluginMethod
    public void pasangUlang(PluginCall call) {
        File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        File[] f = dir != null ? dir.listFiles((d, n) -> n.endsWith(".apk")) : null;
        if (f == null || f.length == 0) { call.reject("Belum ada file pembaruan."); return; }
        pasang(f[0]);
        call.resolve();
    }
}
