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

if (!admin.apps.length) {
  try {
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      admin.initializeApp({ projectId });
    }
  } catch (error: any) {
    console.error("[FIREBASE_ADMIN_ERROR] Initialization failed:", error.message);
  }
}

// PENTING: Memaksa koneksi Admin SDK ke database 'performance'
const db = new Firestore({
  projectId: projectId,
  databaseId: 'performance', 
});

export const auth = admin.auth();
export const adminApp = admin;
export { db };