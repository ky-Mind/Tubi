package com.tubi.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin harus didaftarkan sebelum super.onCreate agar langsung tersedia di JavaScript
        registerPlugin(GoogleAuth.class);
        registerPlugin(BukaAplikasiPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
