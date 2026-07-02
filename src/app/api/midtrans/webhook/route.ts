// src/app/api/midtrans/webhook/route.ts
import { NextResponse } from 'next/server';
import { db, adminApp } from '@/lib/firebase/server';
import midtransClient from 'midtrans-client';
import { addDays } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * Endpoint Webhook untuk menerima notifikasi dari Midtrans secara real-time.
 * Diproses menggunakan database 'performance'.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        const clientKey = process.env.MIDTRANS_CLIENT_KEY;

        if (!serverKey || !clientKey) {
            console.error("[MIDTRANS_WEBHOOK_ERROR] API Keys tidak ditemukan di environment.");
            return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
        }
        
        const apiClient = new midtransClient.CoreApi({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
            serverKey: serverKey,
            clientKey: clientKey
        });

        // Verifikasi keaslian notifikasi dari Midtrans
        const statusResponse = await apiClient.transaction.notification(body);
        
        const orderId = statusResponse.order_id; 
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        // Ambil metadata dari custom fields (dikirim saat create transaction)
        const companyId = statusResponse.custom_field1;
        const planId = statusResponse.custom_field2;

        console.log(`[MIDTRANS_WEBHOOK] Incoming: ${orderId} | Status: ${transactionStatus} | Company: ${companyId}`);

        if (!companyId || !planId) {
            console.warn("[MIDTRANS_WEBHOOK] Metadata (companyId/planId) tidak ditemukan dalam notifikasi.");
            return NextResponse.json({ message: "Missing metadata" }, { status: 400 });
        }

        // Status sukses menurut Midtrans
        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'challenge') {
                console.log(`[MIDTRANS_WEBHOOK] Transaksi dicurigai (challenge): ${orderId}`);
            } else {
                // Pembayaran benar-benar sukses, eksekusi update paket
                await processSuccessfulSubscription(companyId, planId, statusResponse.gross_amount);
            }
        } else if (transactionStatus === 'expire' || transactionStatus === 'cancel' || transactionStatus === 'deny') {
            console.log(`[MIDTRANS_WEBHOOK] Transaksi gagal/expired: ${orderId}`);
            // Opsional: Log kegagalan ke database jika perlu
        }

        return NextResponse.json({ status: 'OK' });

    } catch (error: any) {
        console.error("[MIDTRANS_WEBHOOK_CRITICAL_ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Sinkronisasi data langganan ke Firestore database 'performance'
 */
async function processSuccessfulSubscription(companyId: string, planId: string, amountStr: string) {
    const amount = parseFloat(amountStr);
    
    // Pastikan referensi mengarah ke database 'performance' via server.ts
    const companyRef = db.collection('companies').doc(companyId);
    const planRef = db.collection('subscriptionPlans').doc(planId);
    
    const [companySnap, planSnap] = await Promise.all([companyRef.get(), planRef.get()]);
    
    if (!companySnap.exists) {
        console.error(`[SUBSCRIPTION_ERROR] Company ID "${companyId}" tidak ditemukan.`);
        return;
    }
    
    if (!planSnap.exists) {
        console.error(`[SUBSCRIPTION_ERROR] Plan ID "${planId}" tidak ditemukan.`);
        return;
    }

    const planData = planSnap.data() as any;
    const companyData = companySnap.data() as any;

    const now = new Date();
    const duration = planData.durationDays || 365;
    const expiry = addDays(now, duration);

    const batch = db.batch();

    // 1. Update Paket & Masa Aktif Perusahaan
    batch.update(companyRef, {
        subscriptionPlanId: planId,
        subscriptionActivationDate: now.toISOString(),
        subscriptionExpiryDate: expiry.toISOString(),
        status: 'Aktif',
        // Reset override kustom agar kembali menggunakan limit bawaan paket baru
        customPrice: adminApp.firestore.FieldValue.delete(),
        customUserLimit: adminApp.firestore.FieldValue.delete(),
        customManagementUserLimit: adminApp.firestore.FieldValue.delete(),
        customCompanyLimit: adminApp.firestore.FieldValue.delete(),
    });

    // 2. Simpan Log Audit
    const logRef = db.collection('subscriptionLogs').doc();
    batch.set(logRef, {
        companyId: companyId,
        companyName: companyData.name,
        planId: planId,
        planName: planData.name,
        action: 'UPGRADE',
        amount: amount,
        startDate: now.toISOString(),
        endDate: expiry.toISOString(),
        performedBy: 'Midtrans System (Payment Gateway)',
        timestamp: adminApp.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    console.log(`[SUBSCRIPTION_SUCCESS] Perusahaan ${companyData.name} berhasil di-upgrade ke paket ${planData.name}`);
}
