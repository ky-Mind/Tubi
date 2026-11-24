package com.tubi.app;

import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Menyimpan berkas buatan aplikasi (mis. laporan omzet PDF) ke folder Download HP, lalu langsung membukanya.
 * JS: Capacitor.Plugins.Berkas.simpan({ nama, base64, mime })
 */
@CapacitorPlugin(name = "Berkas")
public class BerkasPlugin extends Plugin {

    @PluginMethod
    public void simpan(PluginCall call) {
        String nama = call.getString("nama", "berkas");
        String data = call.getString("base64", "");
        String mime = call.getString("mime", "application/pdf");
        if (nama == null || !nama.matches("[A-Za-z0-9 _.()-]+")) { call.reject("Nama berkas tidak valid"); return; }
        try {
            byte[] isi = Base64.decode(data, Base64.DEFAULT);
            /* Salinan untuk dibuka sekarang (cache aplikasi, dibagikan lewat FileProvider) */
            File dir = new File(getContext().getCacheDir(), "laporan");
            dir.mkdirs();
            File f = new File(dir, nama);
            try (FileOutputStream o = new FileOutputStream(f)) { o.write(isi); }
            /* Salinan tetap di folder Download (Android 10+, tanpa izin penyimpanan) */
            boolean diDownload = false;
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, nama);
                v.put(MediaStore.Downloads.MIME_TYPE, mime);
                v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri u = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (u != null) try (OutputStream o = getContext().getContentResolver().openOutputStream(u)) { o.write(isi); diDownload = true; }
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            boolean dibuka = true;
            try { getContext().startActivity(i); }
            catch (ActivityNotFoundException e) {
                /* Tidak ada aplikasi pembaca PDF: tawarkan bagikan (WhatsApp, Drive, dll.) */
                Intent b = new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, uri)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getContext().startActivity(Intent.createChooser(b, "Bagikan laporan").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                dibuka = false;
            }
            JSObject r = new JSObject();
            r.put("download", diDownload);
            r.put("dibuka", dibuka);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Gagal menyimpan berkas: " + e.getMessage());
        }
    }
}
