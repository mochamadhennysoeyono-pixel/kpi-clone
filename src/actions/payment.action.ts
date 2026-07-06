
// src/actions/payment.action.ts
"use server";

import midtransClient from 'midtrans-client';
import { db, adminApp } from '@/lib/firebase/server';
import { addDays } from 'date-fns';

/**
 * Membuat transaksi baru di Midtrans untuk aktivasi modul atau penambahan kuota.
 */
export async function createSubscriptionTransaction(
    plan: { id: string; price: number; name: string }, 
    company: { id: string; name: string }, 
    user: { name: string; email: string; phone?: string },
    moduleId?: string // MOD: Menambahkan moduleId untuk sistem modular
) {
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "Mid-server-BaagyjkErNfOuiKha6hsXhlN";
    const clientKey = process.env.MIDTRANS_CLIENT_KEY || "Mid-client-MpjNTjYjtHljjjQ9";
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    if (!serverKey || !clientKey) {
        return { success: false, error: "Sistem pembayaran belum dikonfigurasi." };
    }

    const snap = new midtransClient.Snap({
        isProduction: isProduction,
        serverKey: serverKey,
        clientKey: clientKey
    });

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
            name: plan.name
        }],
        custom_field1: company.id,
        custom_field2: plan.id,
        custom_field3: moduleId || "", // MOD: Menyimpan ID Modul di sini
        callbacks: {
            finish: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.perfom.id'}/subscription-status`
        }
    };

    try {
        const transaction = await snap.createTransaction(parameter);
        return { 
            success: true, 
            token: transaction.token, 
            redirectUrl: transaction.redirect_url 
        };
    } catch (error: any) {
        console.error("[MIDTRANS_API_ERROR]", error.message);
        return { success: false, error: "Gagal menghubungi server pembayaran." };
    }
}

/**
 * Server Action untuk memproses pembaruan MODUL secara langsung (Fallback & Webhook logic).
 */
export async function processModulePaymentSuccess(
    companyId: string, 
    moduleId: string, 
    data: { quota: number, expiryDate: string, amount: number, planName: string, orderId: string, performedBy: string }
) {
    try {
        console.log(`[PAYMENT_MODULAR_ACTION] Processing ${moduleId} for Company: ${companyId}`);
        
        const companyRef = db.collection('companies').doc(companyId);
        const companySnap = await companyRef.get();
        
        if (!companySnap.exists) throw new Error("Data perusahaan tidak ditemukan.");

        const now = new Date();
        const subData = {
            status: 'active',
            type: 'paid',
            quota: data.quota,
            expiryDate: data.expiryDate,
            activatedAt: now.toISOString()
        };

        const batch = db.batch();

        // 1. Update Company Map with Dot Notation
        batch.update(companyRef, {
            [`moduleSubscriptions.${moduleId}`]: subData,
            status: 'Aktif'
        });

        // 2. Create Audit Log
        const logRef = db.collection('subscriptionLogs').doc();
        batch.set(logRef, {
            companyId: companyId,
            companyName: companySnap.data()?.name || "N/A",
            company: companySnap.data()?.name || "N/A",
            moduleId: moduleId,
            planId: 'modular_paid',
            planName: data.planName,
            action: 'UPGRADE',
            amount: data.amount,
            startDate: now.toISOString(),
            endDate: data.expiryDate,
            performedBy: data.performedBy,
            timestamp: adminApp.firestore.FieldValue.serverTimestamp(),
            orderId: data.orderId
        });

        await batch.commit();
        console.log(`[PAYMENT_MODULAR_ACTION] Success! Module ${moduleId} activated.`);
        
        return { success: true };
    } catch (error: any) {
        console.error("[PAYMENT_MODULAR_ACTION_ERROR]", error.message);
        return { success: false, error: error.message };
    }
}
