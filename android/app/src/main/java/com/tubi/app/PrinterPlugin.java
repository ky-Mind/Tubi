package com.tubi.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.OutputStream;
import java.util.UUID;

/**
 * Printer thermal Bluetooth untuk APK Tubi. WebView Android tidak punya Web Bluetooth, dan kebanyakan printer
 * thermal 58/80 mm memakai Bluetooth klasik (SPP), jadi koneksinya dibuat di sini lewat RFCOMM.
 * JS: Capacitor.Plugins.PrinterBT.{izin, daftar, hubungkan({alamat}), kirim({data base64}), putus, status, bukaPengaturan}
 */
@CapacitorPlugin(
    name = "PrinterBT",
    permissions = {
        @Permission(alias = "bt", strings = { Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "btlama", strings = { Manifest.permission.BLUETOOTH, Manifest.permission.BLUETOOTH_ADMIN })
    }
)
public class PrinterPlugin extends Plugin {
    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private BluetoothSocket soket;
    private OutputStream keluar;
    private String nama = "", alamat = "";

    private String alias() { return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? "bt" : "btlama"; }
    private boolean bolehBt() { return getPermissionState(alias()) == PermissionState.GRANTED; }

    private BluetoothAdapter adapter() {
        BluetoothManager m = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return m != null ? m.getAdapter() : null;
    }

    @PluginMethod
    public void izin(PluginCall call) {
        if (bolehBt()) { JSObject r = new JSObject(); r.put("boleh", true); call.resolve(r); return; }
        requestPermissionForAlias(alias(), call, "setelahIzin");
    }

    @PermissionCallback
    private void setelahIzin(PluginCall call) {
        JSObject r = new JSObject();
        r.put("boleh", bolehBt());
        call.resolve(r);
    }

    /** Printer yang sudah dipasangkan (paired) di pengaturan Bluetooth HP. */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void daftar(PluginCall call) {
        if (!bolehBt()) { call.reject("Izin Bluetooth belum diberikan.", "IZIN"); return; }
        BluetoothAdapter a = adapter();
        if (a == null) { call.reject("HP ini tidak punya Bluetooth.", "TIDAK_ADA"); return; }
        if (!a.isEnabled()) { call.reject("Bluetooth HP masih mati. Nyalakan dulu.", "MATI"); return; }
        JSArray arr = new JSArray();
        for (BluetoothDevice d : a.getBondedDevices()) {
            JSObject o = new JSObject();
            o.put("nama", d.getName() != null ? d.getName() : d.getAddress());
            o.put("alamat", d.getAddress());
            int kelas = d.getBluetoothClass() != null ? d.getBluetoothClass().getMajorDeviceClass() : -1;
            o.put("printer", kelas == 0x0600 || (d.getName() != null && d.getName().toLowerCase().matches(".*(print|pos|rpp|mtp|bluetooth printer|thermal|58|80|pt-|zj|xp-|mpt).*")));
            arr.put(o);
        }
        JSObject r = new JSObject();
        r.put("perangkat", arr);
        call.resolve(r);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void hubungkan(PluginCall call) {
        String tujuan = call.getString("alamat");
        if (tujuan == null) { call.reject("Alamat printer kosong."); return; }
        if (!bolehBt()) { call.reject("Izin Bluetooth belum diberikan.", "IZIN"); return; }
        BluetoothAdapter a = adapter();
        if (a == null || !a.isEnabled()) { call.reject("Bluetooth HP masih mati. Nyalakan dulu.", "MATI"); return; }
        new Thread(() -> {
            tutup();
            try {
                BluetoothDevice d = a.getRemoteDevice(tujuan);
                try { a.cancelDiscovery(); } catch (Exception ignored) {}
                BluetoothSocket s = sambung(d);
                soket = s;
                keluar = s.getOutputStream();
                nama = d.getName() != null ? d.getName() : tujuan;
                alamat = tujuan;
                JSObject r = new JSObject();
                r.put("nama", nama);
                r.put("alamat", alamat);
                call.resolve(r);
            } catch (Exception e) {
                tutup();
                call.reject("Gagal tersambung ke printer. Pastikan printer menyala, dekat dengan HP, dan tidak sedang dipakai HP lain.", "GAGAL");
            }
        }).start();
    }

    @SuppressLint("MissingPermission")
    private BluetoothSocket sambung(BluetoothDevice d) throws Exception {
        Exception terakhir = null;
        for (int cara = 0; cara < 3; cara++) {
            BluetoothSocket s = null;
            try {
                if (cara == 0) s = d.createRfcommSocketToServiceRecord(SPP);
                else if (cara == 1) s = d.createInsecureRfcommSocketToServiceRecord(SPP);
                else s = (BluetoothSocket) d.getClass().getMethod("createRfcommSocket", int.class).invoke(d, 1);
                s.connect();
                return s;
            } catch (Exception e) {
                terakhir = e;
                try { if (s != null) s.close(); } catch (Exception ignored) {}
            }
        }
        throw terakhir != null ? terakhir : new Exception("gagal");
    }

    @PluginMethod
    public void kirim(PluginCall call) {
        String data = call.getString("data", "");
        if (keluar == null) { call.reject("Printer belum terhubung.", "PUTUS"); return; }
        new Thread(() -> {
            try {
                byte[] b = Base64.decode(data, Base64.DEFAULT);
                for (int i = 0; i < b.length; i += 512) {
                    keluar.write(b, i, Math.min(512, b.length - i));
                    keluar.flush();
                    Thread.sleep(20);
                }
                call.resolve();
            } catch (Exception e) {
                tutup();
                call.reject("Koneksi ke printer terputus. Hubungkan ulang lalu coba lagi.", "PUTUS");
            }
        }).start();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("terhubung", soket != null && soket.isConnected());
        r.put("nama", nama);
        r.put("alamat", alamat);
        call.resolve(r);
    }

    @PluginMethod
    public void putus(PluginCall call) { tutup(); call.resolve(); }

    @PluginMethod
    public void bukaPengaturan(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    private synchronized void tutup() {
        try { if (keluar != null) keluar.close(); } catch (Exception ignored) {}
        try { if (soket != null) soket.close(); } catch (Exception ignored) {}
        keluar = null;
        soket = null;
    }

    @Override
    protected void handleOnDestroy() { tutup(); }
}
