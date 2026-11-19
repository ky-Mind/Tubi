package com.tubi.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin harus didaftarkan sebelum super.onCreate agar langsung tersedia di JavaScript
        registerPlugin(GoogleAuth.class);
        registerPlugin(BukaAplikasiPlugin.class);
        registerPlugin(PembaruanPlugin.class);
        registerPlugin(PrinterPlugin.class);
        super.onCreate(savedInstanceState);

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
    }

    // Header Tubi berwarna merah sampai ke balik status bar → ikon jam/baterai dibuat putih.
    private void ikonStatusPutih() {
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);
    }
    @Override
    public void onResume() { super.onResume(); ikonStatusPutih(); }
    @Override
    public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) ikonStatusPutih(); }
}
