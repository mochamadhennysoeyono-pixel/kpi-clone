
// src/actions/payment.action.ts
"use server";

import midtransClient from 'midtrans-client';
import { db, adminApp } from '@/lib/firebase/server';
import { addDays } from 'date-fns';

/**
 * Membuat transaksi baru di Midtrans dan mengembalikan Snap Token.
 */
export async function createSubscriptionTransaction(
    plan: { id: string; price: number; name: string }, 
    company: { id: string; name: string }, 
    user: { name: string; email: string; phone?: string }
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
            name: `Paket ${plan.name}`
        }],
        custom_field1: company.id,
        custom_field2: plan.id,
        callbacks: {
            finish: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.kipiai.id'}/subscription-status`
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
 * Server Action untuk memproses pembaruan paket secara langsung (Fallback jika Webhook terhambat).
 */
export async function processPaymentSuccess(companyId: string, planId: string, amount: number, orderId: string) {
    try {
        console.log(`[PAYMENT_SUCCESS_ACTION] Processing for Company: ${companyId}, Plan: ${planId}`);
        
        const companyRef = db.collection('companies').doc(companyId);
        const planRef = db.collection('subscriptionPlans').doc(planId);
        
        const [companySnap, planSnap] = await Promise.all([companyRef.get(), planRef.get()]);
        
        if (!companySnap.exists || !planSnap.exists) {
            throw new Error("Data perusahaan atau paket tidak ditemukan.");
        }

        const planData = planSnap.data() as any;
        const companyData = companySnap.data() as any;

        const now = new Date();
        const duration = planData.durationDays || 365;
        const expiry = addDays(now, duration);

        const batch = db.batch();

        // 1. Update Company
        batch.update(companyRef, {
            subscriptionPlanId: planId,
            subscriptionActivationDate: now.toISOString(),
            subscriptionExpiryDate: expiry.toISOString(),
            status: 'Aktif',
            // Reset custom limits to use plan defaults
            customPrice: adminApp.firestore.FieldValue.delete(),
            customUserLimit: adminApp.firestore.FieldValue.delete(),
            customManagementUserLimit: adminApp.firestore.FieldValue.delete(),
            customCompanyLimit: adminApp.firestore.FieldValue.delete(),
        });

        // 2. Create Audit Log
        const logRef = db.collection('subscriptionLogs').doc();
        batch.set(logRef, {
            companyId: companyId,
            companyName: companyData.name,
            company: companyData.name, // MOD: Explicit 'company' field for MasterDataProvider filter
            planId: planId,
            planName: planData.name,
            action: 'UPGRADE',
            amount: amount,
            startDate: now.toISOString(),
            endDate: expiry.toISOString(),
            performedBy: 'Client Callback (Auto-Verified)',
            timestamp: adminApp.firestore.FieldValue.serverTimestamp(),
            orderId: orderId
        });

        await batch.commit();
        console.log(`[PAYMENT_SUCCESS_ACTION] Database updated successfully for ${companyData.name}`);
        
        return { success: true };
    } catch (error: any) {
        console.error("[PAYMENT_SUCCESS_ACTION_ERROR]", error.message);
        return { success: false, error: error.message };
    }
}
