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
        const serverKey = process.env.MIDTRANS_SERVER_KEY!;
        
        const apiClient = new midtransClient.CoreApi({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
            serverKey: serverKey,
            clientKey: process.env.MIDTRANS_CLIENT_KEY!
        });

        // Verifikasi keaslian notifikasi dari Midtrans
        const statusResponse = await apiClient.transaction.notification(body);
        
        const orderId = statusResponse.order_id; 
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        // Ambil metadata dari custom fields
        const companyId = statusResponse.custom_field1;
        const planId = statusResponse.custom_field2;

        console.log(`[MIDTRANS_WEBHOOK] Notification: ID: ${orderId} | Status: ${transactionStatus} | Company: ${companyId}`);

        if (!companyId || !planId) {
            console.warn("[MIDTRANS_WEBHOOK] Missing metadata in notification fields.");
            return NextResponse.json({ message: "Missing metadata" }, { status: 400 });
        }

        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'challenge') {
                console.log(`[MIDTRANS_WEBHOOK] Transaction challenged: ${orderId}`);
            } else {
                // Pembayaran sukses, jalankan update database
                await processSuccessfulPayment(companyId, planId, statusResponse.gross_amount);
            }
        }

        return NextResponse.json({ status: 'OK' });

    } catch (error: any) {
        console.error("[MIDTRANS_WEBHOOK_ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function processSuccessfulPayment(companyId: string, planId: string, amountStr: string) {
    const amount = parseFloat(amountStr);
    const companyRef = db.collection('companies').doc(companyId);
    const planRef = db.collection('subscriptionPlans').doc(planId);
    
    const [companySnap, planSnap] = await Promise.all([companyRef.get(), planRef.get()]);
    
    if (!companySnap.exists) {
        console.error(`[MIDTRANS_WEBHOOK_ERROR] Company ID "${companyId}" not found.`);
        return;
    }
    
    if (!planSnap.exists) {
        console.error(`[MIDTRANS_WEBHOOK_ERROR] Plan ID "${planId}" not found.`);
        return;
    }

    const planData = planSnap.data() as any;
    const companyData = companySnap.data() as any;

    const now = new Date();
    const expiry = addDays(now, planData.durationDays || 365);

    const batch = db.batch();

    // 1. Update Status Perusahaan
    batch.update(companyRef, {
        subscriptionPlanId: planId,
        subscriptionActivationDate: now.toISOString(),
        subscriptionExpiryDate: expiry.toISOString(),
        status: 'Aktif',
        // Hapus override custom jika ada, kembali ke standar paket yang baru dibeli
        customPrice: adminApp.firestore.FieldValue.delete(),
        customUserLimit: adminApp.firestore.FieldValue.delete(),
        customManagementUserLimit: adminApp.firestore.FieldValue.delete(),
        customCompanyLimit: adminApp.firestore.FieldValue.delete(),
    });

    // 2. Catat Log Histori
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
        performedBy: 'Midtrans Webhook (Automated)',
        timestamp: adminApp.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    console.log(`[MIDTRANS_WEBHOOK_SUCCESS] Updated company ${companyData.name} to plan ${planData.name}`);
}
