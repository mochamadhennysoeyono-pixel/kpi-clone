
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

// Inisialisasi Firebase App (Cegah inisialisasi ganda saat HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

/**
 * Inisialisasi Firestore untuk database 'performance'.
 * Menggunakan pola yang lebih robust untuk memastikan pengaturan Long Polling
 * dan Fetch Streams selalu diterapkan meskipun terjadi re-render.
 */
const DATABASE_ID = "performance";
let db: any;

try {
  // Coba inisialisasi dengan pengaturan khusus
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false, // Membantu stabilitas di lingkungan proxy/restricted network
  }, DATABASE_ID);
  console.log(`[Firestore] Initialized ${DATABASE_ID} with Long Polling.`);
} catch (e: any) {
  // Jika error (misal karena sudah diinisialisasi), ambil instance yang sudah ada
  db = getFirestore(app, DATABASE_ID);
  console.log(`[Firestore] Using existing instance for ${DATABASE_ID}.`);
}

const storage = getStorage(app);

export { app, auth, db, storage, getToken, onMessage, isSupported, getMessaging };
