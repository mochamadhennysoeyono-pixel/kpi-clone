
// src/lib/services/notification-service.ts
'use server';

import { db, auth, adminApp } from "@/lib/firebase/server";
import type { CommunicationCategory } from "@/types";

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
    const fromAddress = process.env.SMTP_FROM_EMAIL || "noreply@perfom.id";

    // Menambahkan dokumen ke koleksi 'mail' di database 'performance'
    const docRef = await db.collection('mail').add({
      to,
      from: fromAddress, 
      message: {
        subject,
        html,
      },
      timestamp: adminApp.firestore.FieldValue.serverTimestamp()
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
        console.log(`[TEMPLATE_FETCH] Searching for category: "${category}"`);
        const templatesRef = db.collection('emailTemplates');
        
        let templateData: any = null;

        // 1. Coba cari berdasarkan ID Dokumen langsung (Paling akurat jika ID == Category)
        const docById = await templatesRef.doc(category).get();
        if (docById.exists) {
            console.log(`[TEMPLATE_FOUND] Found template by ID: "${category}"`);
            templateData = docById.data();
        } 
        
        // 2. Jika tidak ketemu, cari berdasarkan field 'category'
        if (!templateData) {
            const snap = await templatesRef.where('category', '==', category).limit(1).get();
            if (!snap.empty) {
                console.log(`[TEMPLATE_FOUND] Found template by field "category": "${category}"`);
                templateData = snap.docs[0].data();
            }
        }

        // 3. Fallback terakhir: Ambil semua ID untuk debugging jika gagal
        if (!templateData) {
            const allDocs = await templatesRef.get();
            const existingIds = allDocs.docs.map(d => d.id).join(', ');
            const existingCategories = allDocs.docs.map(d => d.data().category).filter(Boolean).join(', ');
            
            console.error(`[TEMPLATE_NOT_FOUND] Category: "${category}". IDs found: [${existingIds}]. Categories found: [${existingCategories}]`);
            
            throw new Error(`Template "${category}" tidak ditemukan. Tersedia ID: [${existingIds}]`);
        }

        let html = templateData.htmlContent || "";
        let subject = templateData.subject || "";

        html = replacePlaceholders(html, context);
        subject = replacePlaceholders(subject, context);

        await sendEmail([to], subject, html);
    } catch (error: any) {
        console.error("[TEMPLATED_EMAIL_ERROR]", error.message);
        throw error;
    }
}

/**
 * Helper internal untuk mengganti {{placeholder}} dengan nilai context
 */
function replacePlaceholders(text: string, context: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const safeValue = value || '';
        result = result.replace(regex, safeValue);
    }
    return result;
}

/**
 * Generate Link Reset dan kirim via SMTP.
 */
export async function sendPasswordResetEmailWithSmtp(email: string, userName: string, origin?: string | null): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`[AUTH_SERVICE] Reset link request for: ${email}`);
        
        // Bersihkan origin dari trailing slash
        let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || "https://app.perfom.id";
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        
        const actionCodeSettings = { 
            url: `${baseUrl}/login`,
            handleCodeInApp: true 
        };

        let resetLink;
        try {
            resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
        } catch (authError: any) {
            if (authError.code === 'auth/unauthorized-continue-uri') {
                console.error(`[AUTH_SERVICE_ERROR] Domain "${baseUrl}" is not allowlisted in Firebase Console.`);
                return { 
                    success: false, 
                    error: `Domain aplikasi (${baseUrl}) belum didaftarkan di Authorized Domains pada Firebase Console. Harap hubungi Admin.` 
                };
            }
            throw authError;
        }
        
        await sendTemplatedEmail(email, 'password_reset', {
            nama_pengguna: userName,
            link: resetLink
        });

        return { success: true };
    } catch (error: any) {
        console.error("[AUTH_SERVICE_ERROR] Email:", email, "Error:", error.message);
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

        message = replacePlaceholders(message, context);

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
