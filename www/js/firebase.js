import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import * as A from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import * as F from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBX6gj6mboRztlrF9ILRXD1gnHHIB94Bqo",
  authDomain: "tubi-app.firebaseapp.com",
  projectId: "tubi-app",
  messagingSenderId: "492656969625",
  appId: "1:492656969625:web:3bdcd40350d28241b53508"
};
export const app = initializeApp(firebaseConfig);
export const auth = A.getAuth(app);
export const db = F.getFirestore(app);
export { A, F };
// Email admin tetap (juga ada di firestore.rules). Admin tambahan disimpan di koleksi `admins`.
export const FIXED_ADMINS = ["hilmykia@gmail.com"];
