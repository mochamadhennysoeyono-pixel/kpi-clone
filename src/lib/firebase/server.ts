// src/lib/firebase/server.ts
import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

/**
 * @fileOverview Inisialisasi Firebase Admin SDK (Sisi Server).
 * Disinkronkan dengan variabel lingkungan FIREBASE_ dari Dashboard App Hosting.
 */

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || "kpi-dev-vjyoo";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.PRIVATE_KEY;

if (privateKey) {
    // Bersihkan kunci dari kutip dan handle newline literal (\n)
    privateKey = privateKey.trim();
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  try {
    // Gunakan Sertifikat jika kredensial lengkap tersedia
    if (clientEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY')) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log(`[FIREBASE_ADMIN] Initialized with Service Account for: ${projectId}`);
    } else {
      // Fallback ke Default Credentials (untuk environment Google Cloud)
      admin.initializeApp({ projectId });
      console.warn(`[FIREBASE_ADMIN] Initialized with Application Default Credentials for: ${projectId}`);
    }
  } catch (error: any) {
    console.error("[FIREBASE_ADMIN_ERROR] Initialization failed:", error.message);
  }
}

// Inisialisasi Firestore dengan ID database spesifik
const db = new Firestore({
  projectId: projectId,
  databaseId: 'performance', // <-- MENGGUNAKAN DATABASE 'PERFORMANCE'
});

export const auth = admin.auth();
export const adminApp = admin;
export { db }; // Ekspor instance Firestore yang sudah dikonfigurasi