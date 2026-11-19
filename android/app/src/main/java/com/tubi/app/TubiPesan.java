package com.tubi.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Penerima push Tubi (meniru pola pucupucu). Gateway mengirim pesan FCM "data-only" berprioritas tinggi, jadi
 * onMessageReceived SELALU dipanggil, termasuk saat aplikasi ditutup / prosesnya mati. Notifikasinya dibangun di sini
 * (kanal bersuara "tubi-pesanan", ikon Tubi), dan saat diketuk membuka MainActivity dengan extra "href" supaya
 * aplikasi langsung menuju pesanan / chat yang dimaksud.
 * Saat aplikasi sedang terbuka di layar, notifikasi tidak ditampilkan di sini (aplikasi sudah mengabari sendiri).
 */
public class TubiPesan extends MessagingService {
    static final String KANAL = "tubi-pesanan";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage pesan) {
        Map<String, String> d = pesan.getData();
        if (d == null || !d.containsKey("judul")) { super.onMessageReceived(pesan); return; }
        if (MainActivity.terlihat) return;   // aplikasi di depan: kabar sudah muncul lewat aplikasi
        tampilkan(this, d);
    }

    static void siapkanKanal(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(KANAL) != null) return;
        NotificationChannel ch = new NotificationChannel(KANAL, "Pesanan & chat", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Pesanan baru, status pesanan, pembayaran, dan chat");
        ch.enableVibration(true);
        ch.enableLights(true);
        ch.setLightColor(0xFFC8232C);
        ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        Uri suara = Uri.parse("android.resource://" + c.getPackageName() + "/" + R.raw.tubi);
        ch.setSound(suara, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        nm.createNotificationChannel(ch);
    }

    static void tampilkan(Context c, Map<String, String> d) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        siapkanKanal(c);
        String judul = d.get("judul"), isi = d.containsKey("isi") ? d.get("isi") : "", href = d.containsKey("href") ? d.get("href") : "/";
        String tag = d.containsKey("tag") ? d.get("tag") : judul;
        int id = Math.abs(tag.hashCode());

        Intent buka = new Intent(c, MainActivity.class)
            .setAction("tubi.BUKA." + id)
            .putExtra("href", href)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, id, buka, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, KANAL)
            .setSmallIcon(R.drawable.ic_stat_tubi)
            .setColor(0xFFC8232C)
            .setContentTitle(judul)
            .setContentText(isi)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(isi))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory("chat".equals(d.get("jenis")) ? NotificationCompat.CATEGORY_MESSAGE : NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(pi);
        try { NotificationManagerCompat.from(c).notify(tag, id, b.build()); } catch (SecurityException ignored) {}
    }
}
