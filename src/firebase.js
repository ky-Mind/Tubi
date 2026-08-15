import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBX6gj6mboRztlrF9ILRXD1gnHHIB94Bqo",
  authDomain: "tubi-app.firebaseapp.com",
  projectId: "tubi-app",
  storageBucket: "tubi-app.firebasestorage.app",
  messagingSenderId: "492656969625",
  appId: "1:492656969625:web:3bdcd40350d28241b53508",
  measurementId: "G-311K0RXQDF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const ADMIN_EMAIL = "hilmykia@gmail.com";