// TUBI CONFIG — isi bagian firebase dengan Web App Config dari Firebase Console.
// Jangan masukkan service-account private key di browser.
// Admin pertama sudah disiapkan. Tambahkan email admin lain ke array admins.
export const CONFIG = {
  appName: "Tubi",
  admins: [
    "Hilmykia@gmail.com"
  ],
  firebase: {
    apiKey: "PASTE_FIREBASE_API_KEY",
    authDomain: "PASTE_FIREBASE_AUTH_DOMAIN",
    projectId: "PASTE_FIREBASE_PROJECT_ID",
    storageBucket: "PASTE_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "PASTE_FIREBASE_MESSAGING_SENDER_ID",
    appId: "PASTE_FIREBASE_APP_ID"
  }
};
