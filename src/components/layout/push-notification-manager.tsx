// src/components/layout/push-notification-manager.tsx
"use client";

import { useEffect, useCallback, useState, useRef } from 'react';
import { getToken, onMessage, isSupported, getMessaging } from '@/lib/firebase/client';
import { db, app } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/auth-context';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { BellRing, X } from 'lucide-react';
import { Button } from '../ui/button';

export function PushNotificationManager() {
    const { currentUser, userRole } = useAuth(); // MOD: Get userRole
    const { toast } = useToast();
    const [showBanner, setShowBanner] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const tokenRef = useRef<string | null>(null);

    const saveTokenToFirestore = useCallback(async (token: string) => {
        if (!currentUser || !userRole) return;
        try {
            // MOD: Determine collection based on role
            const collectionName = userRole === 'superadmin' ? 'superadmins' : 'employees';
            const userRef = doc(db, collectionName, currentUser.id);
            await updateDoc(userRef, {
                fcmTokens: arrayUnion(token)
            });
            tokenRef.current = token;
            console.log(`FCM Token sync successful for role: ${userRole}`);
        } catch (error) {
            console.error('Error saving token:', error);
        }
    }, [currentUser, userRole]); // MOD: Add userRole to dependencies

    const removeTokenFromFirestore = useCallback(async (token: string) => {
        if (!currentUser || !userRole) return;
        try {
            const collectionName = userRole === 'superadmin' ? 'superadmins' : 'employees';
            const userRef = doc(db, collectionName, currentUser.id);
            await updateDoc(userRef, {
                fcmTokens: arrayRemove(token)
            });
            console.log('FCM Token removed successfully');
        } catch (error) {
            console.error('Error removing token:', error);
        }
    }, [currentUser, userRole]);

    const requestPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !currentUser) return;

        setIsSubscribing(true);
        try {
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

                const messaging = getMessaging(app);
                const token = await getToken(messaging, {
                    // MOD: Update VAPID key
                    vapidKey: 'BO5Xao6GcfOtdzIXHWR7c4x1PWAsfyzOPXezy6dN-MbZGAY1B4stPLq6XFmUilTiOHxdSDiuP11dVdyqHlyjUmc',
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    await saveTokenToFirestore(token);
                } else {
                    console.warn('No registration token available. Request permission to generate one.');
                }
            } else {
                console.log('Unable to get permission to notify.');
            }
        } catch (error) {
            console.error('An error occurred while requesting permission: ', error);
        } finally {
            setIsSubscribing(false);
        }
    }, [currentUser, saveTokenToFirestore]);

    useEffect(() => {
        if (
            typeof window !== 'undefined' &&
            'Notification' in window && 
            window.Notification.permission === 'default' &&
            currentUser
        ) {
            setShowBanner(true);
        }
    }, [currentUser]);

    useEffect(() => {
        const cleanup = async () => {
            if (tokenRef.current) {
                await removeTokenFromFirestore(tokenRef.current);
                tokenRef.current = null;
            }
        };
        
        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup(); // Also cleanup on component unmount
        };
    }, [removeTokenFromFirestore]);

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Alert className="max-w-md">
                <BellRing className="h-4 w-4" />
                <AlertTitle>Aktifkan Notifikasi</AlertTitle>
                <AlertDescription className="mt-2">
                    Dapatkan pembaruan penting dan pengingat langsung di perangkat Anda. Izinkan notifikasi untuk pengalaman terbaik.
                </AlertDescription>
                <div className="mt-4 flex justify-end gap-4">
                    <Button variant="outline" size="sm" onClick={() => setShowBanner(false)}>
                        Nanti Saja
                    </Button>
                    <Button size="sm" onClick={requestPermission} disabled={isSubscribing}>
                        {isSubscribing ? 'Memproses...' : 'Aktifkan'}
                    </Button>
                </div>
            </Alert>
        </div>
    );
}
