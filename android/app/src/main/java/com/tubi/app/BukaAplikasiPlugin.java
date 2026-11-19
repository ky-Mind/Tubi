package com.tubi.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Membuka aplikasi e-wallet / bank (GoPay, DANA, BCA, ...) dari halaman pembayaran Tubi.
 * Bila aplikasinya belum terpasang, pengguna dibawa ke halaman aplikasi itu di Play Store.
 * Daftar paket yang boleh dicek ada di <queries> AndroidManifest.xml (wajib sejak Android 11).
 */
@CapacitorPlugin(name = "BukaAplikasi")
public class BukaAplikasiPlugin extends Plugin {

    @PluginMethod
    public void buka(PluginCall call) {
        String paket = call.getString("paket", "");
        if (paket == null || !paket.matches("[A-Za-z0-9_.]+")) {
            call.reject("Nama paket tidak valid");
            return;
        }
        JSObject hasil = new JSObject();
        Intent buka = getContext().getPackageManager().getLaunchIntentForPackage(paket);
        if (buka != null) {
            buka.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(buka);
            hasil.put("terpasang", true);
            call.resolve(hasil);
            return;
        }
        Intent toko = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + paket));
        toko.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(toko);
        } catch (ActivityNotFoundException e) {
            Intent web = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + paket));
            web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(web);
        }
        hasil.put("terpasang", false);
        call.resolve(hasil);
    }
}
