package com.tubi.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    /** true selama Tubi tampil di layar (push tidak perlu ditampilkan oleh TubiPesan). */
    static volatile boolean terlihat = false;
    private final Handler utama = new Handler(Looper.getMainLooper());
    private static final int KODE_IZIN = 41;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin harus didaftarkan sebelum super.onCreate agar langsung tersedia di JavaScript
        registerPlugin(GoogleAuth.class);
        registerPlugin(BukaAplikasiPlugin.class);
        registerPlugin(PembaruanPlugin.class);
        registerPlugin(PrinterPlugin.class);
        super.onCreate(savedInstanceState);
        TubiPesan.siapkanKanal(this);

        // Tombol kembali Android: tanya dulu ke aplikasi web (tutup panel, mundur satu halaman, atau
        // "tekan sekali lagi untuk keluar"). Aplikasi hanya keluar bila web menjawab false.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView web = getBridge() != null ? getBridge().getWebView() : null;
                if (web == null) { moveTaskToBack(true); return; }
                web.evaluateJavascript("(window.tubiBack ? window.tubiBack() : 'none')", hasil -> {
                    if ("true".equals(hasil)) return;
                    if ("false".equals(hasil)) { moveTaskToBack(true); return; }
                    if (web.canGoBack()) web.goBack(); else moveTaskToBack(true);
                });
            }
        });

        bukaDariNotifikasi(getIntent());
        mintaSemuaIzin();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        bukaDariNotifikasi(intent);
    }

    // ---------- Notifikasi diketuk → buka halaman tujuan (juga saat aplikasi dibuka dari keadaan mati) ----------
    private void bukaDariNotifikasi(Intent i) {
        if (i == null) return;
        String href = i.getStringExtra("href");
        if (href == null || href.isEmpty() || !href.startsWith("/")) return;
        i.removeExtra("href");
        kirimKeWeb("window.tubiBuka ? (window.tubiBuka(" + JSONObject.quote(href) + "), 'ok') : 'belum'", 0);
    }

    /** Ulangi sampai halaman web siap (maks. ±15 detik), seperti pucupucu. */
    private void kirimKeWeb(String js, int ke) {
        utama.postDelayed(() -> {
            WebView web = getBridge() != null ? getBridge().getWebView() : null;
            if (web == null) { if (ke < 100) kirimKeWeb(js, ke + 1); return; }
            web.evaluateJavascript(js, hasil -> { if (!"\"ok\"".equals(hasil) && ke < 100) kirimKeWeb(js, ke + 1); });
        }, ke == 0 ? 50 : 150);
    }

    // ---------- Izin: diminta sekaligus saat pertama kali dibuka dan setiap selesai update ----------
    private void mintaSemuaIzin() {
        SharedPreferences p = getSharedPreferences("tubi", MODE_PRIVATE);
        String versi;
        try { versi = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { versi = "?"; }
        if (versi.equals(p.getString("izinVersi", ""))) return;
        p.edit().putString("izinVersi", versi).apply();
        List<String> perlu = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 33) tambahBila(perlu, Manifest.permission.POST_NOTIFICATIONS);
        tambahBila(perlu, Manifest.permission.ACCESS_FINE_LOCATION);
        tambahBila(perlu, Manifest.permission.ACCESS_COARSE_LOCATION);
        tambahBila(perlu, Manifest.permission.CAMERA);
        if (Build.VERSION.SDK_INT >= 31) tambahBila(perlu, Manifest.permission.BLUETOOTH_CONNECT);
        if (perlu.isEmpty()) { mintaBebasBaterai(); return; }
        utama.postDelayed(() -> requestPermissions(perlu.toArray(new String[0]), KODE_IZIN), 600);
    }

    private void tambahBila(List<String> l, String izin) {
        if (ContextCompat.checkSelfPermission(this, izin) != PackageManager.PERMISSION_GRANTED) l.add(izin);
    }

    @Override
    public void onRequestPermissionsResult(int kode, @NonNull String[] izin, @NonNull int[] hasil) {
        super.onRequestPermissionsResult(kode, izin, hasil);
        if (kode == KODE_IZIN) mintaBebasBaterai();
    }

    /** Supaya notifikasi tetap masuk saat HP hemat daya: minta Tubi dikecualikan dari pengoptimalan baterai. */
    @SuppressLint("BatteryLife")
    private void mintaBebasBaterai() {
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm == null || pm.isIgnoringBatteryOptimizations(getPackageName())) return;
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName()));
            startActivity(i);
        } catch (Exception ignored) {}
    }

    // Header Tubi berwarna merah sampai ke balik status bar → ikon jam/baterai dibuat putih.
    private void ikonStatusPutih() {
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);
    }
    @Override
    public void onResume() { super.onResume(); terlihat = true; ikonStatusPutih(); }
    @Override
    public void onPause() { super.onPause(); terlihat = false; }
    @Override
    public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) ikonStatusPutih(); }
}
