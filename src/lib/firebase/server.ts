// src/lib/firebase/server.ts
import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

/**
 * @fileOverview Inisialisasi Firebase Admin SDK (Sisi Server).
 * Terkunci ke Project: studio-2326395113-859ef (systemprf)
 * Terkunci ke Database: performance
 */

const projectId = "studio-2326395113-859ef";

// Logika inisialisasi tunggal (Singleton) yang lebih aman untuk Next.js
if (!admin.apps.length) {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.trim().replace(/\\n/g, '\n');
  }

  try {
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("[FIREBASE_ADMIN] Initialized with Service Account.");
    } else {
      // Fallback ke Application Default Credentials (ADC) atau Studio Auth
      admin.initializeApp({ projectId });
      console.log("[FIREBASE_ADMIN] Initialized with Project ID fallback.");
    }
  } catch (error: any) {
    console.error("[FIREBASE_ADMIN_ERROR] Initialization failed:", error.message);
  }
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

// Export services secara langsung dari modul admin
export const auth = admin.auth();
export const adminApp = admin;
export { db };
