
// src/lib/services/notification-service.ts
'use server';

import { db, auth, adminApp } from "@/lib/firebase/server";
import type { CommunicationCategory } from "@/types";

const FieldValue = adminApp.firestore.FieldValue;

/**
 * Mengirim email mentah melalui koleksi 'mail' di database 'performance'.
 * Extension "Trigger Email" akan mendeteksi dokumen baru di sini.
 */
export async function sendEmail(
  to: string[],
  subject: string,
  html: string
): Promise<void> {
  try {
    console.log(`[SMTP_ATTEMPT] Queueing email to: ${to.join(', ')} in 'performance' DB`);
    
    // Alamat pengirim: Gunakan email sederhana tanpa tag nama jika SMTP ketat
    const fromAddress = process.env.SMTP_FROM_EMAIL || "noreply@kipiai.id";

    // Menulis langsung ke koleksi 'mail' di database 'performance'
    const docRef = await db.collection('mail').add({
      to,
      from: fromAddress, 
      message: {
        subject,
        html,
      },
      timestamp: FieldValue.serverTimestamp()
    });

    console.log(`[SMTP_SUCCESS] Mail queued with ID: ${docRef.id} in 'performance' DB.`);
  } catch (error: any) {
    console.error("[SMTP_ERROR] Failed to queue email in 'performance' DB:", error.message);
    throw new Error(`Gagal mengantrekan email: ${error.message}`);
  }
}

/**
 * Mengambil template dari Firestore (database performance) dan mengirim via SMTP.
 */
export async function sendTemplatedEmail(
    to: string,
    category: CommunicationCategory,
    context: Record<string, string>
): Promise<void> {
    try {
        console.log(`[TEMPLATE_QUERY] Fetching template for category: ${category} from 'performance' DB`);
        
        // Template dicari di database performance
        const snap = await db.collection('emailTemplates')
            .where('category', '==', category)
            .limit(1)
            .get();
        
        if (snap.empty) {
            console.error(`[TEMPLATE_ERROR] Template category "${category}" not found in emailTemplates collection.`);
            throw new Error(`Template Email dengan kategori "${category}" tidak ditemukan.`);
        }

        const templateData = snap.docs[0].data();
        let html = templateData.htmlContent || "";
        let subject = templateData.subject || "";

        if (!html) throw new Error(`Konten HTML pada template "${category}" kosong.`);

        // Replace placeholders: mencari format {{key}}
        console.log(`[TEMPLATE_PARSE] Injecting context into template for: ${to}`);
        for (const [key, value] of Object.entries(context)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            const safeValue = value || '';
            html = html.replace(regex, safeValue);
            subject = subject.replace(regex, safeValue);
        }

        await sendEmail([to], subject, html);
    } catch (error: any) {
        console.error("[TEMPLATED_EMAIL_ERROR]", error.message);
        throw error;
    }
}

/**
 * Generate Link Reset dan kirim via SMTP.
 */
export async function sendPasswordResetEmailWithSmtp(email: string, userName: string): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`[AUTH_SERVICE] Generating reset link for: ${email}`);
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://systemprf.firebaseapp.com`;
        const actionCodeSettings = { url: `${baseUrl}/login` };

        // Generate link resmi dari Firebase Auth Admin
        // Fungsi ini akan throw error jika email tidak terdaftar di Firebase Auth
        const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
        
        console.log(`[AUTH_SERVICE] Reset link generated successfully.`);

        await sendTemplatedEmail(email, 'password_reset', {
            nama_pengguna: userName,
            link: resetLink
        });

        return { success: true };
    } catch (error: any) {
        console.error("[AUTH_SERVICE_ERROR] Failed for email:", email, "Error:", error.message);
        
        let friendlyError = error.message;
        if (error.code === 'auth/user-not-found') {
            friendlyError = "Email ini belum terdaftar di sistem otentikasi login.";
        }
        
        return { success: false, error: friendlyError };
    }
}

/**
 * Mengirim pesan WhatsApp via Fonnte API.
 */
export async function sendWhatsApp(target: string, message: string): Promise<{ success: boolean; error?: string }> {
    const token = process.env.FONNTE_TOKEN;
    
    if (!token) {
        console.error("[FONNTE_CRITICAL_ERROR] FONNTE_TOKEN tidak ditemukan.");
        return { success: false, error: "Sistem WhatsApp belum terkonfigurasi di server." };
    }

    let cleanTarget = target.replace(/\D/g, '');
    if (cleanTarget.startsWith('0')) {
        cleanTarget = '62' + cleanTarget.substring(1);
    }

    if (cleanTarget.length < 10) {
        return { success: false, error: "Format nomor telepon tidak valid." };
    }

    try {
        const params = new URLSearchParams();
        params.append('target', cleanTarget);
        params.append('message', message);
        params.append('token', token);

        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: { 'Authorization': token },
            body: params,
        });

        const result = await response.json();
        
        if (result.status || result.detail === 'success') {
            return { success: true };
        } else {
            return { success: false, error: result.reason || 'Gagal mengirim WA' };
        }
    } catch (error: any) {
        return { success: false, error: "Gangguan jaringan WhatsApp." };
    }
}

/**
 * Mengambil template WhatsApp dan mengirimnya dengan konteks data.
 */
export async function sendTemplatedWhatsApp(to: string, category: CommunicationCategory, context: Record<string, string>): Promise<void> {
    try {
        const snap = await db.collection('whatsappTemplates')
            .where('category', '==', category)
            .limit(1)
            .get();
            
        if (snap.empty) return;

        const templateData = snap.docs[0].data();
        let message = templateData.message || "";

        for (const [key, value] of Object.entries(context)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            message = message.replace(regex, value || '');
        }

        await sendWhatsApp(to, message);
    } catch (error: any) {
        console.error("[TEMPLATE_WA_ERROR]", error.message);
    }
}

export async function sendWelcomeWhatsApp(data: { name: string, phone: string, companyName: string }): Promise<void> {
    await sendTemplatedWhatsApp(data.phone, 'registration', { 
        nama_pengguna: data.name, 
        company_name: data.companyName 
    });
}

export async function notifyAdminNewRegistration(data: { name: string, email: string, companyName: string, phone: string }): Promise<void> {
    const adminNumber = process.env.ADMIN_WA_NUMBER || "6281234599171";
    await sendTemplatedWhatsApp(adminNumber, 'other', { 
        nama_pengguna: data.name, 
        company_name: data.companyName, 
        email: data.email, 
        telepon: data.phone 
    });
}
