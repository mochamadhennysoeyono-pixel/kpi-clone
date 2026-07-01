// src/lib/firebase/client.ts
"use client";

import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: "studio-2326395113-859ef", // Locked to systemprf
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

/**
 * PENTING: Memaksa koneksi ke database 'performance'.
 * Menggunakan initializeFirestore dengan experimentalForceLongPolling 
 * untuk mengatasi masalah "Could not reach Cloud Firestore backend" di lingkungan terbatas.
 */
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, "performance");

const storage = getStorage(app);

export { app, auth, db, storage, getToken, onMessage, isSupported, getMessaging };
