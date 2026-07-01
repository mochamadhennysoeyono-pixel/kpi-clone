// src/lib/firebase/server.ts
import * as admin from 'firebase-admin';

/**
 * @fileOverview Inisialisasi Firebase Admin SDK (Sisi Server) menggunakan Service Account.
 * Terkunci ke Project: studio-2326395113-859ef (systemprf)
 * Terkunci ke Database: performance
 */

const projectId = "studio-2326395113-859ef";
const clientEmail = "firebase-adminsdk-fbsvc@studio-2326395113-859ef.iam.gserviceaccount.com";
const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDI/8kbXzavb4xu\nQSApuLc3+NLVjZU9it1kwrD3RzqX0OTtQePYtv3Smk/VdBkwEjehec+UzXR1v4Sh\n/nuF1LLRoyK9H4mSM5nsWy5yqnfbz3kqzNLvBfJlZYPIcOrdrxeZncXPxb9F+zvz\n4AFqhjOcyPeO7qBkVIQ66q8RdbERG7FFE+b0GNaECrqLT6bWLEJZcdxTH4ji/0nW\nb1QVe+phEujJKSZIc03d8f3TsSJ/64hdX5c5UmjmRZ6Rv+zNjszECWlOs9IDyuye\nXtnB9jF0MJXp0mwd/YcpTyy5fKe36fuCRrjSY3rXM+YlkmK0pIjJE6ZBKvGnxNXb\n2yppQkD9AgMBAAECggEAATSPdyuN/2VS2UJot/dUmfBTC1bLA1B23WjReNojfs+Q\n399aR21pfj7Qpb4JfKFPVheN6B2HSkF4wSPuh7Hr1Jf+2FV9FLRcgu9VCvj8uQO4\nfUo3JZnKh1MhhC0xK10mbhRlIEbWS8wi4uZ/+6yMWK9X1LKXoaJkHJpVrGwhQLIA\nE7Ha3vljAiEHtTdxxMiUuoJyPPrLi0ey+XaOql5HJM4vcqJW/jNeXBYElf3uxK48\nBwvtQRV1+XxC8wC1H1OqiGjn7L1DZRHJvYXR4dQwFLVi1ZFO+0IJcxpOIntG7Hxs\n2nvRePN7SIIxnRcE0tPB7cXVmMkftAlWUlZnty75XQKBgQD/n82U6XJokuoax4x8\n0+ipZsfhuwBQ/ijH06LkQAuBt/evfQSfOHrczxNwkayrSupzJdwIBWbpcZeNC+qc\nfU/4W5ESPGTva7XXT6VqsinNWVD6jSCAP+3ltJcWoooUtb+fywk92co9aYdkc2VK\nT1zpJsi+YLJdqQYQZw7aud70nwKBgQDJS20JMjez9QLEFRaNhkU31JXzJsG6H/T1\nM/VkKDQlgxxclzElptwRAZhqE24mCLUPK9GIB89zHT0X3Vgp28hdzc10nZXM4ZJG\nnIcDKIGJ9CL/tTE87GE/AO3/bfeFe7/1gWNKRDDdBxfobquF7li4Cqu5OT5I+s95\ndFMdy5mo4wKBgAuRmeZBYnIlI/8uRMdpd8Ai7Kzkn7EKr6HLjDW0SFEImGcSy2DB\nV54iqQiRLzVZYJ7xebHLPMsX3vn9LhMDANmGm1wt64uCXmpuKlhX09h9UFLmjDAB\ntKyOrb/Sf1lMmG2M7NAlySdaXUxIhK8GRHgwzyj+i1P90E5xu5RekR6VAoGAUrrc\nMlZgTGbbXylnnnzbv+lwQ4HfRxbRP2G+bg6T+ALdyjQdb+MXOSoVsSsRLzKO75BL\nyoOjQCV5MXC4RmPdAqiN02rc4VqoGrtERgkEzGT5aWzXsrlX8mP4bO2OOF828rjd\nzO0fxAehTNcHScE+100TbMnZDnd+g+VKL8m4+o8CgYEA6b2+tTsPOahfcgtEFz+R\nBiBxmZ2gFrL5EwaK0RTUzJiX2VwY0t6Z8Z/pAAwfpiCQg/KgZvr54MeGSXV8u3aN\nCPkrG6VyQBYrH/LDyjTdECy4iJB1XQ20zr5SlDThOsVK3jK4SLRMldmcNDf6Z5a4\n1JBn7gX3CfcGFuWzmf+DNmY=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n');

function getApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  
  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error: any) {
    console.error("[FIREBASE_ADMIN_ERROR] Initialization failed, returning existing app if any:", error.message);
    return admin.app();
  }
}

const app = getApp();

export const auth = app.auth();
export const adminApp = admin;

/** 
 * db: Mengarah ke database 'performance' (Utama Aplikasi)
 * Semua data termasuk koleksi 'mail' sekarang berada di sini.
 */
export const db = app.firestore('performance');

export { app };
