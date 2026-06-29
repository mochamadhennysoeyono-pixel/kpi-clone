// src/lib/services/notification-service.ts
'use server';

import { db, auth } from "@/lib/firebase/server";
import { adminApp } from "@/lib/firebase/server";
import type { CommunicationCategory, EmailTemplate, WhatsappTemplate } from "@/types";

const FieldValue = adminApp.firestore.FieldValue;

/**
 * Mengirim email mentah melalui koleksi 'mail' (Trigger Email Extension).
 */
export async function sendEmail(
  to: string[],
  subject: string,
  html: string
): Promise<void> {
  try {
    console.log(`[SMTP_ATTEMPT] Queueing email to: ${to.join(', ')}`);
    await db.collection('mail').add({
      to,
      message: {
        subject,
        html,
      },
      timestamp: FieldValue.serverTimestamp()
    });
    console.log(`[SMTP_SUCCESS] Document added to 'mail' collection.`);
  } catch (error: any) {
    console.error("[SMTP_ERROR] Failed to write to 'mail' collection:", error.message);
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
    const snap = await db.collection('emailTemplates')
        .where('category', '==', category)
        .limit(1)
        .get();
    
    if (snap.empty) {
        throw new Error(`Template Email "${category}" tidak ditemukan.`);
    }

    const template = { id: snap.docs[0].id, ...snap.docs[0].data() } as EmailTemplate;
    let html = template.htmlContent;
    let subject = template.subject;

    for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, value || '');
        subject = subject.replace(regex, value || '');
    }

    await sendEmail([to], subject, html);
}

/**
 * Generate Link Reset dan kirim via SMTP.
 */
export async function sendPasswordResetEmailWithSmtp(email: string, userName: string): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`[AUTH_SERVICE] Generating link for: ${email}`);
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://app.kipiai.id`;
        const actionCodeSettings = { url: `${baseUrl}/login` };

        const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
        
        await sendTemplatedEmail(email, 'password_reset', {
            nama_pengguna: userName,
            link: resetLink
        });

        return { success: true };
    } catch (error: any) {
        console.error("[AUTH_SERVICE_ERROR]", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Mengirim pesan WhatsApp via Fonnte API.
 * MENGAMBIL TOKEN LANGSUNG DARI ENVIRONMENT VARIABLES (FIREBASE CONSOLE).
 */
export async function sendWhatsApp(target: string, message: string): Promise<{ success: boolean; error?: string }> {
    const token = process.env.FONNTE_TOKEN;
    
    if (!token) {
        const errorMsg = "[FONNTE_CRITICAL_ERROR] FONNTE_TOKEN tidak ditemukan di Environment Variables. Pastikan sudah diset di Firebase App Hosting Console (Secrets).";
        console.error(errorMsg);
        return { success: false, error: "Sistem WhatsApp belum terkonfigurasi di server." };
    }

    // --- NORMALISASI NOMOR OTOMATIS ---
    // 1. Hapus semua karakter non-angka
    let cleanTarget = target.replace(/\D/g, '');
    // 2. Jika diawali '08', ganti menjadi '628'
    if (cleanTarget.startsWith('0')) {
        cleanTarget = '62' + cleanTarget.substring(1);
    }
    // 3. Pastikan minimal panjang nomor masuk akal
    if (cleanTarget.length < 10) {
        return { success: false, error: "Format nomor telepon tidak valid." };
    }

    try {
        console.log(`[FONNTE_ATTEMPT] Mengirim WA ke: ${cleanTarget}`);
        
        const params = new URLSearchParams();
        params.append('target', cleanTarget);
        params.append('message', message);
        params.append('token', token); // Tetap sertakan di body untuk kompatibilitas

        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': token // Beberapa server mewajibkan ini
            },
            body: params,
        });

        const result = await response.json();
        
        if (result.status || result.detail === 'success') {
            console.log(`[FONNTE_SUCCESS] Pesan terkirim ke ${cleanTarget}`);
            return { success: true };
        } else {
            const apiError = result.reason || result.message || 'Alasan tidak diketahui';
            console.error(`[FONNTE_API_ERROR] API merespon gagal: ${apiError}`);
            return { success: false, error: apiError };
        }
    } catch (error: any) {
        console.error("[FONNTE_NETWORK_ERROR] Gagal menghubungi API Fonnte:", error.message);
        return { success: false, error: "Terjadi gangguan jaringan saat mengirim pesan WhatsApp." };
    }
}

/**
 * Mengambil template WhatsApp dan mengirimnya dengan konteks data.
 */
export async function sendTemplatedWhatsApp(to: string, category: CommunicationCategory, context: Record<string, string>): Promise<void> {
    try {
        console.log(`[FONNTE_TEMPLATE_QUERY] Searching for category: ${category}`);
        const snap = await db.collection('whatsappTemplates')
            .where('category', '==', category)
            .limit(1)
            .get();
            
        if (snap.empty) {
            console.warn(`[FONNTE_WARN] Template WA dengan kategori "${category}" tidak ditemukan di database.`);
            return;
        }

        const template = { id: snap.docs[0].id, ...snap.docs[0].data() } as WhatsappTemplate;
        let message = template.message;

        for (const [key, value] of Object.entries(context)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            message = message.replace(regex, value || '');
        }

        const result = await sendWhatsApp(to, message);
        if (!result.success) {
            console.error(`[FONNTE_SEND_FAIL] Gagal mengirim template ${category} ke ${to}: ${result.error}`);
        }
    } catch (error: any) {
        console.error("[TEMPLATE_WA_ERROR] Gagal memproses template WA:", error.message);
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
