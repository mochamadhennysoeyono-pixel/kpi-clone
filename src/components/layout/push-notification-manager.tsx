// src/components/layout/push-notification-manager.tsx
"use client";

import { useEffect, useCallback, useState, useRef } from 'react';
import { getToken, onMessage, db, app, isSupported, getMessaging } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/auth-context';
import { doc, updateDoc, arrayUnion, collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { BellRing, X } from 'lucide-react';
import { Button } from '../ui/button';

export function PushNotificationManager() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [showBanner, setShowBanner] = useState(false);
    const lastProcessedId = useRef<string | null>(null);
    const mountTime = useRef<number>(Date.now());

    const saveTokenToFirestore = useCallback(async (token: string) => {
        if (!currentUser) return;
        try {
            const userRef = doc(db, 'employees', currentUser.id);
            await updateDoc(userRef, {
                fcmTokens: arrayUnion(token)
            });
            console.log('FCM Token sync successful');
        } catch (error) {
            console.error('Error saving token:', error);
        }
    }, [currentUser]);

    const requestPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !currentUser) return;

        try {
            // CRITICAL FIX: Check if messaging is supported before doing anything
            const supported = await isSupported();
            if (!supported) {
                console.warn("Firebase Messaging is not supported in this browser environment.");
                setShowBanner(false);
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setShowBanner(false);
                
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                    scope: '/'
                });

                // Initialize messaging only after confirming support
                const messaging = getMessaging(app);
                const token = await getToken(messaging, {
                    vapidKey: 'BGN3KFCKXtuseRgW87Dw6-0ey-65C5ul4mKuVowt-umGIpo7X8ogRdFebxbOz716PtXDd7CGQ1ejvWIdAewI6R4',
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    await saveTokenToFirestore(token);
                    toast({
                        title: "Notifikasi Aktif!",
                        description: "Anda akan menerima update penting secara real-time.",
                    });
                }
            } else if (permission === 'denied') {
                setShowBanner(false);
            }
        } catch (error) {
            console.error('An error occurred while retrieving token:', error);
        }
    }, [currentUser, saveTokenToFirestore, toast]);

    // AUTO-BRIDGE: Listen to Firestore notifications and trigger System UI automatically
    useEffect(() => {
        if (!currentUser || !('serviceWorker' in navigator)) return;

        const q = query(
            collection(db, "notifications"),
            where("recipientId", "==", currentUser.id),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) return;

            // Sort by timestamp descending in JS to avoid complex index requirements
            const docs = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .sort((a, b) => {
                    const tA = a.timestamp?.toMillis?.() || 0;
                    const tB = b.timestamp?.toMillis?.() || 0;
                    return tB - tA;
                });

            const latestNotif = docs[0];
            
            // Only trigger if it's unread and truly new (created after this component mounted)
            if (!latestNotif.isRead) {
                const notifTime = latestNotif.timestamp?.toMillis?.() || Date.now();
                
                if (latestNotif.id !== lastProcessedId.current && notifTime > mountTime.current) {
                    lastProcessedId.current = latestNotif.id;
                    
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        if ('showNotification' in registration) {
                            registration.showNotification(`KIPIAI: ${latestNotif.category || 'Update Baru'}`, {
                                body: latestNotif.message,
                                icon: 'https://cdn.scalev.id/business_files/yVvqA_tsSzvt5_Yf2lNStxvP/1757745293765-k%20(8).webp',
                                badge: 'https://cdn.scalev.id/business_files/yVvqA_tsSzvt5_Yf2lNStxvP/1757745293765-k%20(8).webp',
                                tag: latestNotif.id,
                                data: {
                                    url: latestNotif.link || '/action-center'
                                },
                                vibrate: [200, 100, 200]
                            });
                        }
                    } catch (e) {
                        console.error("System notification trigger failed:", e);
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        const checkSupportAndShowBanner = async () => {
            if (currentUser && typeof window !== 'undefined' && 'Notification' in window) {
                const supported = await isSupported();
                if (!supported) return;

                if (Notification.permission === 'default') {
                    const timer = setTimeout(() => setShowBanner(true), 3000);
                    return () => clearTimeout(timer);
                } else if (Notification.permission === 'granted') {
                    requestPermission();
                }
            }
        };
        
        checkSupportAndShowBanner();
    }, [currentUser, requestPermission]);

    if (!showBanner) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-fade-in no-print">
            <Alert className="bg-primary text-primary-foreground border-none shadow-2xl relative overflow-hidden ring-4 ring-background">
                <button onClick={() => setShowBanner(false)} className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full"><X size={14} /></button>
                <div className="flex items-start gap-4 pr-6">
                    <div className="p-2 bg-white/20 rounded-full animate-bounce mt-1"><BellRing size={20} /></div>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <AlertTitle className="font-bold">Aktifkan Notifikasi?</AlertTitle>
                            <AlertDescription className="text-xs opacity-90 leading-tight">
                                Agar Anda tidak ketinggalan update KPI, tugas tim, dan pesan penting secara real-time di bar notifikasi perangkat Anda.
                            </AlertDescription>
                        </div>
                        <Button size="sm" variant="secondary" className="font-bold text-xs h-8 px-4 shadow-sm" onClick={requestPermission}>Izinkan Sekarang</Button>
                    </div>
                </div>
            </Alert>
        </div>
    );
}
