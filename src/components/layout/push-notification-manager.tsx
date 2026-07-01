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
    const { currentUser, userRole } = useAuth();
    const { toast } = useToast();
    const [showBanner, setShowBanner] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const tokenRef = useRef<string | null>(null);

    const saveTokenToFirestore = useCallback(async (token: string) => {
        if (!currentUser || !userRole) return;
        try {
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
    }, [currentUser, userRole]);

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

    // MOD: Rewritten to be more robust
    const requestPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !currentUser) return;

        setIsSubscribing(true);
        try {
            const supported = await isSupported();
            if (!supported) {
                console.warn("Firebase Messaging is not supported in this browser.");
                setShowBanner(false);
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Notification permission not granted.');
                setShowBanner(false); // Hide banner if they explicitly deny
                return;
            }
            
            setShowBanner(false);

            // MOD: Wait for the service worker to be ready before getting the token
            const registration = await navigator.serviceWorker.ready;
            
            console.log('Service Worker is active, proceeding to get token.');

            const messaging = getMessaging(app);
            const token = await getToken(messaging, {
                // MOD: Updated VAPID key as requested
                vapidKey: 'BO5Xao6GcfOtdzIXHWR7c4x1PWAsfyzOPXezy6dN-MbZGAY1B4stPLq6XFmUilTiOHxdSDiuP11dVdyqHlyjUmc',
                serviceWorkerRegistration: registration
            });

            if (token) {
                console.log('FCM Token received:', token);
                await saveTokenToFirestore(token);
            } else {
                console.warn('No registration token available. This could be due to a browser or network issue.');
            }

        } catch (error) {
            console.error('An error occurred during push notification setup:', error);
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
            // Use a small delay to prevent the banner from appearing too aggressively on page load
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [currentUser]);

    // MOD: Simplified cleanup logic
    useEffect(() => {
        const cleanup = async () => {
            if (tokenRef.current) {
                await removeTokenFromFirestore(tokenRef.current);
                tokenRef.current = null;
            }
        };
        
        // The `beforeunload` event is unreliable. A better approach for cleanup
        // is to handle it on user logout, but for session-end, this is a best-effort.
        // The main cleanup happens on component unmount (e.g., user navigates away within the app).
        return () => {
            cleanup();
        };
    }, [removeTokenFromFirestore]);
    
    // MOD: Added onMessage listener to handle foreground notifications
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const messaging = getMessaging(app);
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received.', payload);
            toast({
                title: payload.notification?.title || "Notifikasi Baru",
                description: payload.notification?.body,
            });
        });

        return () => unsubscribe();
    }, [toast]);

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
            <Alert className="max-w-md shadow-lg">
                <BellRing className="h-4 w-4" />
                <AlertTitle className="font-semibold">Aktifkan Notifikasi Push</AlertTitle>
                <AlertDescription className="mt-1">
                    Dapatkan pembaruan penting dan pengingat langsung di perangkat Anda untuk pengalaman terbaik.
                </AlertDescription>
                <div className="mt-3 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowBanner(false)}>
                        Lain Kali
                    </Button>
                    <Button size="sm" onClick={requestPermission} disabled={isSubscribing}>
                        {isSubscribing ? 'Memproses...' : 'Ya, Izinkan'}
                    </Button>
                </div>
            </Alert>
        </div>
    );
}
