
// src/lib/firebase/client.ts
"use client";

import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

/**
 * Konfigurasi Firebase Resmi untuk Project: studio-2326395113-859ef
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDoMxUbYranRraDBXQAGAGtBkhD5vSWGa4",
  authDomain: "studio-2326395113-859ef.firebaseapp.com",
  projectId: "studio-2326395113-859ef",
  storageBucket: "studio-2326395113-859ef.firebasestorage.app",
  messagingSenderId: "621995680672",
  appId: "1:621995680672:web:111bdaf43b37db7a94bac5",
};

// Inisialisasi Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

/**
 * Inisialisasi Firestore untuk database 'performance'.
 * Menggunakan pola Try-Catch untuk menangani Hot Module Replacement (HMR) 
 * agar tidak mencoba menginisialisasi ulang database yang sama.
 */
let db: any;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // Wajib untuk lingkungan Cloud Workstations/Restricted Network
    experimentalAutoDetectLongPolling: true,
  }, "performance");
} catch (e) {
  // Jika sudah diinisialisasi (misal saat HMR), ambil instance yang ada
  db = getFirestore(app, "performance");
}

const storage = getStorage(app);

export { app, auth, db, storage, getToken, onMessage, isSupported, getMessaging };
