// src/app/api/midtrans/webhook/route.ts
import { NextResponse } from 'next/server';
import { db, adminApp } from '@/lib/firebase/server';
import midtransClient from 'midtrans-client';
import { addDays } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * Endpoint Webhook untuk menerima notifikasi dari Midtrans secara real-time.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const serverKey = process.env.MIDTRANS_SERVER_KEY || "Mid-server-BaagyjkErNfOuiKha6hsXhlN";
        const clientKey = process.env.MIDTRANS_CLIENT_KEY || "Mid-client-MpjNTjYjtHljjjQ9";

        const apiClient = new midtransClient.CoreApi({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
            serverKey: serverKey,
            clientKey: clientKey
        });

        // Verifikasi keaslian notifikasi
        const statusResponse = await apiClient.transaction.notification(body);
        
        const orderId = statusResponse.order_id; 
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        // Metadata dari custom fields
        const companyId = statusResponse.custom_field1;
        const planId = statusResponse.custom_field2;

        console.log(`[MIDTRANS_WEBHOOK] Received notification: ${orderId} | Status: ${transactionStatus}`);

        if (!companyId || !planId) {
            console.warn("[MIDTRANS_WEBHOOK] Missing metadata (companyId/planId) in notification.");
            return NextResponse.json({ message: "OK but skipped" });
        }

        // Logika Aktivasi Paket
        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'challenge') {
                console.log(`[MIDTRANS_WEBHOOK] Transaction challenged: ${orderId}`);
            } else {
                console.log(`[MIDTRANS_WEBHOOK] Payment successful! Activating plan...`);
                await processSuccessfulSubscription(companyId, planId, statusResponse.gross_amount);
            }
        }

        return NextResponse.json({ status: 'OK' });

    } catch (error: any) {
        console.error("[MIDTRANS_WEBHOOK_ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Sinkronisasi data langganan ke Firestore database 'performance'
 */
async function processSuccessfulSubscription(companyId: string, planId: string, amountStr: string) {
    const amount = parseFloat(amountStr);
    const companyRef = db.collection('companies').doc(companyId);
    const planRef = db.collection('subscriptionPlans').doc(planId);
    
    const [companySnap, planSnap] = await Promise.all([companyRef.get(), planRef.get()]);
    
    if (!companySnap.exists || !planSnap.exists) {
        console.error(`[SUBSCRIPTION_ERROR] Company or Plan data not found.`);
        return;
    }

    const planData = planSnap.data() as any;
    const companyData = companySnap.data() as any;

    const now = new Date();
    const duration = planData.durationDays || 365;
    const expiry = addDays(now, duration);

    const batch = db.batch();

    // Update Company Record
    batch.update(companyRef, {
        subscriptionPlanId: planId,
        subscriptionActivationDate: now.toISOString(),
        subscriptionExpiryDate: expiry.toISOString(),
        status: 'Aktif',
        // Menghapus batasan kustom lama (jika ada) agar mengikuti standar paket baru
        customPrice: adminApp.firestore.FieldValue.delete(),
        customUserLimit: adminApp.firestore.FieldValue.delete(),
        customManagementUserLimit: adminApp.firestore.FieldValue.delete(),
        customCompanyLimit: adminApp.firestore.FieldValue.delete(),
    });

    // Create Audit Log
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
        performedBy: 'Midtrans Webhook',
        timestamp: adminApp.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    console.log(`[SUBSCRIPTION_SUCCESS] Company ${companyData.name} upgraded to ${planData.name}`);
}
