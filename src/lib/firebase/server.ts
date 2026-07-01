// src/lib/firebase/server.ts
import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

/**
 * @fileOverview Inisialisasi Firebase Admin SDK (Sisi Server).
 * Terkunci ke Project: studio-2326395113-859ef (systemprf)
 * Terkunci ke Database: performance
 */

const projectId = "studio-2326395113-859ef";

function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.trim().replace(/\\n/g, '\n');
  }

  try {
    if (clientEmail && privateKey) {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      // Fallback ke Application Default Credentials (ADC) atau Studio Auth
      return admin.initializeApp({ projectId });
    }
  } catch (error: any) {
    // Jika karena suatu hal (HMR) aplikasi sudah ada walau apps.length 0
    if (/already exists/.test(error.message)) {
      return admin.app();
    }
    console.error("[FIREBASE_ADMIN_ERROR] Critical failure:", error.message);
    throw error;
  }
}

// Inisialisasi instance aplikasi tunggal
const app = initializeAdmin();

/**
 * PENTING: Memaksa koneksi Admin SDK ke database 'performance'.
 * ignoreUndefinedProperties ditambahkan untuk kestabilan penulisan data.
 */
const db = new Firestore({
  projectId: projectId,
  databaseId: 'performance', 
  ignoreUndefinedProperties: true,
});

// Export services secara langsung dari instance aplikasi yang sudah pasti ada
export const auth = app.auth();
export const adminApp = admin;
export { db, app };
