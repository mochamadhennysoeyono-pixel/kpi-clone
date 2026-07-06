
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
        const moduleId = statusResponse.custom_field3; // MOD: Mendeteksi apakah ini pembayaran modul

        console.log(`[MIDTRANS_WEBHOOK] Received notification: ${orderId} | Status: ${transactionStatus}`);

        if (!companyId) {
            console.warn("[MIDTRANS_WEBHOOK] Missing companyId in notification.");
            return NextResponse.json({ message: "OK but skipped" });
        }

        // Logika Aktivasi
        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'challenge') {
                console.log(`[MIDTRANS_WEBHOOK] Transaction challenged: ${orderId}`);
            } else {
                console.log(`[MIDTRANS_WEBHOOK] Payment successful! Processing activation...`);
                
                if (moduleId) {
                    // JALUR MODULAR
                    await processModularActivation(companyId, moduleId, statusResponse);
                } else {
                    // JALUR LEGACY (FULL PLAN)
                    await processLegacyActivation(companyId, planId, statusResponse);
                }
            }
        }

        return NextResponse.json({ status: 'OK' });

    } catch (error: any) {
        console.error("[MIDTRANS_WEBHOOK_ERROR]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Aktivasi Modul Spesifik (Sistem Baru)
 */
async function processModularActivation(companyId: string, moduleId: string, status: any) {
    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) return;

    const amount = parseFloat(status.gross_amount);
    const now = new Date();
    
    // Asumsi default 1 tahun jika tidak ada info lain, atau hitung dari item_details jika ada
    const expiry = addDays(now, 365); 

    // Ambil kuota dari item_id atau asumsikan dari transaksi sebelumnya
    // Dalam realita, kita bisa parse dari item_details
    const quota = 10; 

    const subData = {
        status: 'active',
        type: 'paid',
        quota: quota,
        expiryDate: expiry.toISOString(),
        activatedAt: now.toISOString()
    };

    const batch = db.batch();
    batch.update(companyRef, {
        [`moduleSubscriptions.${moduleId}`]: subData,
        status: 'Aktif'
    });

    const logRef = db.collection('subscriptionLogs').doc();
    batch.set(logRef, {
        companyId,
        companyName: companySnap.data()?.name,
        company: companySnap.data()?.name,
        moduleId,
        planName: `Aktivasi Modul ${moduleId.toUpperCase()} (via Webhook)`,
        action: 'UPGRADE',
        amount: amount,
        startDate: now.toISOString(),
        endDate: expiry.toISOString(),
        performedBy: 'Midtrans Webhook',
        timestamp: adminApp.firestore.FieldValue.serverTimestamp(),
        orderId: status.order_id
    });

    await batch.commit();
}

/**
 * Aktivasi Paket Keseluruhan (Sistem Lama/Fallback)
 */
async function processLegacyActivation(companyId: string, planId: string, status: any) {
    const companyRef = db.collection('companies').doc(companyId);
    const planRef = db.collection('subscriptionPlans').doc(planId);
    const [cSnap, pSnap] = await Promise.all([companyRef.get(), planRef.get()]);
    
    if (!cSnap.exists || !pSnap.exists) return;

    const planData = pSnap.data();
    const expiry = addDays(new Date(), planData?.durationDays || 365);

    const batch = db.batch();
    batch.update(companyRef, {
        subscriptionPlanId: planId,
        subscriptionActivationDate: new Date().toISOString(),
        subscriptionExpiryDate: expiry.toISOString(),
        status: 'Aktif'
    });

    const logRef = db.collection('subscriptionLogs').doc();
    batch.set(logRef, {
        companyId,
        companyName: cSnap.data()?.name,
        company: cSnap.data()?.name,
        planName: planData?.name,
        action: 'UPGRADE',
        amount: parseFloat(status.gross_amount),
        startDate: new Date().toISOString(),
        endDate: expiry.toISOString(),
        performedBy: 'Midtrans Webhook',
        timestamp: adminApp.firestore.FieldValue.serverTimestamp(),
        orderId: status.order_id
    });

    await batch.commit();
}
