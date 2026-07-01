// src/lib/firebase/server.ts
import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

/**
 * @fileOverview Inisialisasi Firebase Admin SDK (Sisi Server).
 * Terkunci ke Project: studio-2326395113-859ef (systemprf)
 * Terkunci ke Database: performance
 */

const projectId = "studio-2326395113-859ef";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
    privateKey = privateKey.trim().replace(/\\n/g, '\n');
}

// Inisialisasi App secara aman
let app: admin.app.App;

if (admin.apps.length === 0) {
  try {
    if (clientEmail && privateKey) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      // Fallback ke Application Default Credentials (ADC) atau Studio Auth
      app = admin.initializeApp({ projectId });
    }
    console.log("[FIREBASE_ADMIN] Initialized new app instance.");
  } catch (error: any) {
    console.error("[FIREBASE_ADMIN_ERROR] Initialization failed:", error.message);
    // Jika gagal, ambil instance default yang mungkin sudah ada (walau apps.length tadi 0)
    app = admin.app();
  }
} else {
  app = admin.app();
}

/**
 * PENTING: Memaksa koneksi Admin SDK ke database 'performance'.
 * ignoreUndefinedProperties ditambahkan untuk kestabilan penulisan data.
 */
const db = new Firestore({
  projectId: projectId,
  databaseId: 'performance', 
  ignoreUndefinedProperties: true,
});

// Export services dari instance yang sudah diverifikasi
export const auth = app.auth();
export const adminApp = admin;
export { db };
