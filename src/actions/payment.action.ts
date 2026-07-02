// src/actions/payment.action.ts
"use server";

import midtransClient from 'midtrans-client';
import type { SubscriptionPlan, Employee, Company } from '@/types';

/**
 * Membuat transaksi baru di Midtrans dan mengembalikan Snap Token.
 * MENGAMBIL API KEYS LANGSUNG DARI ENVIRONMENT VARIABLES.
 */
export async function createSubscriptionTransaction(
    plan: SubscriptionPlan, 
    company: Company, 
    user: Employee
) {
    // Mengambil kredensial dari System Environment Variables
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "Mid-server-BaagyjkErNfOuiKha6hsXhlN";
    const clientKey = process.env.MIDTRANS_CLIENT_KEY || "Mid-client-MpjNTjYjtHljjjQ9";
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    if (!serverKey || !clientKey) {
        const errorMsg = "[MIDTRANS_CRITICAL_ERROR] API Keys tidak ditemukan di Environment Variables.";
        console.error(errorMsg);
        return { 
            success: false, 
            error: "Sistem pembayaran belum siap dikonfigurasi di server." 
        };
    }

    const snap = new midtransClient.Snap({
        isProduction: isProduction,
        serverKey: serverKey,
        clientKey: clientKey
    });

    // Gunakan ID unik untuk order_id agar tidak bentrok saat testing
    const orderId = `SUB-${company.id.substring(0,5)}-${Date.now()}`;

    const parameter = {
        transaction_details: {
            order_id: orderId,
            gross_amount: Math.floor(plan.price)
        },
        customer_details: {
            first_name: user.name,
            email: user.email,
            phone: user.phone || ""
        },
        item_details: [{
            id: plan.id,
            price: Math.floor(plan.price),
            quantity: 1,
            name: `Paket ${plan.name}`
        }],
        // Field custom1 & custom2 digunakan oleh Webhook untuk identifikasi target update
        custom_field1: company.id,
        custom_field2: plan.id,
        callbacks: {
            finish: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kipiai.id'}/subscription-status`
        }
    };

    try {
        console.log(`[MIDTRANS_INVOKE] Creating transaction ${orderId} for company ${company.name}...`);
        const transaction = await snap.createTransaction(parameter);
        return { 
            success: true, 
            token: transaction.token, 
            redirectUrl: transaction.redirect_url 
        };
    } catch (error: any) {
        console.error("[MIDTRANS_API_ERROR] Terjadi kesalahan saat memanggil API Midtrans:", error.message);
        
        let friendlyError = "Terjadi kesalahan saat menghubungi server pembayaran.";
        if (error.message?.includes('401')) {
            friendlyError = "Otentikasi Gagal: Cek Server Key & Mode (Sandbox/Prod).";
        }
        
        return { success: false, error: friendlyError };
    }
}
