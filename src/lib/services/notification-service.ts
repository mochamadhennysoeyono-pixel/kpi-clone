// src/lib/services/notification-service.ts
'use server';

import { db, auth, adminApp } from "@/lib/firebase/server";
import type { CommunicationCategory } from "@/types";

const FieldValue = adminApp.firestore.FieldValue;

/**
 * Mengirim email mentah melalui koleksi 'mail' di database 'performance'.
 */
export async function sendEmail(
  to: string[],
  subject: string,
  html: string
): Promise<void> {
  try {
    console.log(`[SMTP_ATTEMPT] Queueing email to: ${to.join(', ')}`);
    const fromAddress = process.env.SMTP_FROM_EMAIL || "noreply@kipiai.id";

    const docRef = await db.collection('mail').add({
      to,
      from: fromAddress, 
      message: {
        subject,
        html,
      },
      timestamp: FieldValue.serverTimestamp()
    });

    console.log(`[SMTP_SUCCESS] Mail queued with ID: ${docRef.id}`);
  } catch (error: any) {
    console.error("[SMTP_ERROR] Failed to queue email:", error.message);
    throw new Error(`Gagal mengantrekan email: ${error.message}`);
  }
}

/**
 * Mengambil template dari Firestore dan mengirim via SMTP.
 */
export async function sendTemplatedEmail(
    to: string,
    category: CommunicationCategory,
    context: Record<string, string>
): Promise<void> {
    try {
        console.log(`[TEMPLATE_QUERY] Searching for category: "${category}"...`);
        
        // Coba cari dengan kueri eksak
        const snap = await db.collection('emailTemplates')
            .where('category', '==', category)
            .limit(1)
            .get();
        
        if (snap.empty) {
            // DEBUG: Jika tidak ketemu, list semua yang ada buat liat ada typo atau nggak
            const allTemplates = await db.collection('emailTemplates').get();
            const available = allTemplates.docs.map(d => d.data().category);
            console.error(`[TEMPLATE_NOT_FOUND] Category "${category}" missing. Available categories in DB:`, available);
            
            throw new Error(`Template Email dengan kategori "${category}" tidak ditemukan.`);
        }

        const templateData = snap.docs[0].data();
        let html = templateData.htmlContent || "";
        let subject = templateData.subject || "";

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
        
        const projectId = "studio-2326395113-859ef";
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${projectId}.firebaseapp.com`;
        
        const actionCodeSettings = { 
            url: `${baseUrl}/login`,
            handleCodeInApp: true 
        };

        const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
        
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
    if (!token) return { success: false, error: "Sistem WhatsApp belum terkonfigurasi." };

    let cleanTarget = target.replace(/\D/g, '');
    if (cleanTarget.startsWith('0')) cleanTarget = '62' + cleanTarget.substring(1);

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
        return (result.status || result.detail === 'success') ? { success: true } : { success: false, error: result.reason };
    } catch (error: any) {
        return { success: false, error: "Gangguan jaringan WhatsApp." };
    }
}

/**
 * Mengambil template WhatsApp dan mengirimnya.
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
