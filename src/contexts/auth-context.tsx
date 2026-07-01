// src/contexts/auth-context.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeApp, deleteApp } from "firebase/app";
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword, 
  deleteUser, 
  EmailAuthProvider, 
  updatePassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  type ConfirmationResult, 
  getAuth,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client'; 
import type { Employee, CompanyAdmin, UserRole, Company } from '@/types';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, updateDoc, DocumentData, UpdateData, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { sendPasswordResetEmailWithSmtp, notifyAdminNewRegistration, sendWelcomeWhatsApp } from '@/lib/services/notification-service';
import { addDays } from 'date-fns';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export type CompanyRegistrationData = {
    name: string;
    email: string;
    companyName: string;
    phone: string;
    password?: string;
};

export type EmployeeActivationData = {
    name: string;
    email: string;
    password?: string;
};

interface AuthContextType {
  currentUser: any | null; 
  firebaseUser: User | null;
  userRole: UserRole;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isLoggingOut: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
  registerCompanyAccount: (data: CompanyRegistrationData) => Promise<{ success: boolean; error?: string; message?: string }>;
  activateEmployeeAccount: (data: EmployeeActivationData) => Promise<{ success: boolean; error?: string; message?: string }>;
  addUserAsAdmin: (employeeData: Omit<Employee, 'id' | 'loginStatus'>, sendInvitationEmail?: boolean, silent?: boolean) => Promise<{ success: boolean; error?: string; message?: string }>;
  addCompanyAdmin: (adminData: Omit<CompanyAdmin, 'id' | 'authUid' | 'loginStatus' | 'createdAt'>, sendInvitationEmail?: boolean) => Promise<{ success: boolean; error?: string; message?: string }>;
  sendPasswordReset: (email: string, isSilent?: boolean) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (userId: string, data: UpdateData<DocumentData>) => Promise<{ success: boolean; error?: string }>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
        setIsLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const superadminDocRef = doc(db, 'superadmins', user.uid);
        const superadminDoc = await getDoc(superadminDocRef);

        if (superadminDoc.exists()) {
            const userProfile = { ...superadminDoc.data(), id: superadminDoc.id } as any;
            userProfile.role = 'superadmin';
            setCurrentUser(userProfile);
            setUserRole('superadmin'); 
            setFirebaseUser(user);
        } else {
            const companyAdminDocRef = doc(db, 'companyAdmins', user.uid);
            const companyAdminDoc = await getDoc(companyAdminDocRef);

            if (companyAdminDoc.exists()) {
                const userProfile = { ...companyAdminDoc.data(), id: companyAdminDoc.id } as any;
                setCurrentUser(userProfile);
                setUserRole('manajemen');
                setFirebaseUser(user);
            } else {
                const employeeDocRef = doc(db, 'employees', user.uid);
                const employeeDoc = await getDoc(employeeDocRef);

                if (employeeDoc.exists()) {
                  const userProfile = { ...employeeDoc.data(), id: employeeDoc.id } as any;
                  setCurrentUser(userProfile);
                  setUserRole(userProfile.role || 'user');
                  setFirebaseUser(user);
                } else {
                    console.warn(`[Auth] No profile found for ${user.uid}`);
                    setCurrentUser(null);
                    setFirebaseUser(null);
                    setUserRole(null);
                }
            }
        }
      } else {
        setCurrentUser(null);
        setFirebaseUser(null);
        setUserRole(null);
      }
      setIsLoading(false);
      setIsLoggingOut(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loginWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), pass);
      return { success: true };
    } catch (e: any) {
      console.error("Login error:", e);
      setIsLoading(false);
      return { success: false, error: 'Email atau kata sandi salah.' };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);
    try {
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (e: any) {
      console.error("Error during Google login:", e);
      setIsLoading(false);
      return { success: false, error: e.message };
    }
  };

  const loginWithPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    setIsLoading(true);
    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        window.confirmationResult = confirmationResult;
        setIsLoading(false);
        return { success: true };
    } catch (error: any) {
        setIsLoading(false);
        return { success: false, error: error.message };
    }
  };

  const verifyOtp = async (otp: string) => {
    setIsLoading(true);
    try {
        if (window.confirmationResult) {
            await window.confirmationResult.confirm(otp);
            return { success: true };
        }
        throw new Error('Konfirmasi OTP hilang.');
    } catch (error: any) {
        setIsLoading(false);
        return { success: false, error: error.message };
    }
  };
  
  const registerCompanyAccount = async (data: CompanyRegistrationData): Promise<{ success: boolean; error?: string; message?: string }> => {
    setIsLoading(true);
    let newUser: User | null = null;
    try {
        const companyQuery = query(collection(db, "companies"), where("name", "==", data.companyName));
        const companySnapshot = await getDocs(companyQuery);
        if (!companySnapshot.empty) {
            setIsLoading(false);
            return { success: false, error: "Nama perusahaan sudah terdaftar." };
        }

        const userCredential = await createUserWithEmailAndPassword(auth, data.email.toLowerCase().trim(), data.password!);
        newUser = userCredential.user;

        const batch = writeBatch(db);
        const companyRef = doc(collection(db, "companies"));
        const logRef = doc(collection(db, "subscriptionLogs"));
        
        const now = new Date();
        const expiry = addDays(now, 14);

        batch.set(companyRef, {
            name: data.companyName,
            businessField: "Lainnya",
            address: "N/A",
            status: "Aktif",
            canBecomeHolding: true,
            subscriptionPlanId: 'default-trial',
            subscriptionActivationDate: now.toISOString(),
            subscriptionExpiryDate: expiry.toISOString(),
            customUserLimit: 5,
            customManagementUserLimit: 2,
            features: {
                hasAiKpiWizard: true,
                hasPageAssistant: true,
                hasFeedbackCoach: true,
                hasKpiSuggestion: true,
                hasScenarioPlanner: true
            }
        });

        const adminRef = doc(db, "companyAdmins", newUser.uid);
        batch.set(adminRef, {
            name: data.name,
            email: data.email.toLowerCase().trim(),
            phone: data.phone,
            company: data.companyName,
            role: "manajemen",
            status: "Aktif",
            loginStatus: "Active",
            authUid: newUser.uid,
            createdAt: serverTimestamp(),
        });

        batch.set(logRef, {
            companyId: companyRef.id,
            companyName: data.companyName,
            planId: 'default-trial',
            planName: 'TRIAL',
            action: 'TRIAL',
            amount: 0,
            startDate: now.toISOString(),
            endDate: expiry.toISOString(),
            performedBy: 'Self Registration',
            timestamp: serverTimestamp(),
        });
        
        await batch.commit();

        // Async Background Notifications
        notifyAdminNewRegistration(data).catch(console.error);
        sendWelcomeWhatsApp(data).catch(console.error);
        
        // Auto-logout after registration to force formal login if needed, 
        // or keep logged in. Here we keep them logged in for better UX.
        // await signOut(auth);
        
        return { success: true, message: "Pendaftaran berhasil! Akun Manajemen Anda sudah siap." };
    } catch (e: any) {
        if (newUser) await deleteUser(newUser).catch(() => {});
        setIsLoading(false);
        return { success: false, error: e.message };
    }
  };

  const activateEmployeeAccount = async (data: EmployeeActivationData) => {
    return { success: true, message: "Akun siap diaktivasi." };
  };

  const addUserAsAdmin = async (employeeData: Omit<Employee, 'id' | 'loginStatus'>, sendInvitationEmail = false, silent = false) => {
    return { success: false, error: "Fungsi ini dipindahkan." };
  };

  const addCompanyAdmin = async (adminData: Omit<CompanyAdmin, 'id' | 'authUid' | 'loginStatus' | 'createdAt'>, sendInvitationEmail = false) => {
    setIsLoading(true);
    const tempApp = initializeApp(auth.app.options, `temp-${Date.now()}`);
    const tempAuth = getAuth(tempApp);
    
    try {
      const email = adminData.email.toLowerCase().trim();
      const tempPassword = Math.random().toString(36).slice(-10);

      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, tempPassword);
      const newUser = userCredential.user;
  
      await setDoc(doc(db, "companyAdmins", newUser.uid), {
        ...adminData,
        email,
        authUid: newUser.uid,
        loginStatus: sendInvitationEmail ? 'Invited' : 'No Login',
        createdAt: serverTimestamp(),
      });

      if (sendInvitationEmail) {
        await sleep(1000); 
        await sendPasswordReset(email, true); 
      }
      
      return { success: true, message: `Berhasil menambahkan admin ${adminData.name}.` };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      await signOut(tempAuth).catch(() => {});
      await deleteApp(tempApp).catch(() => {});
      setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string, isSilent = false) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!isSilent) setIsLoading(true);
    
    try {
        await sendPasswordResetEmailWithSmtp(cleanEmail, "Pengguna");
        return { success: true };
    } catch(e: any) {
        return { success: false, error: e.message };
    } finally {
        if (!isSilent) setIsLoading(false);
    }
  };

  const updateUserProfile = async (userId: string, data: UpdateData<DocumentData>) => {
    setIsLoading(true);
    try {
      let col = 'employees';
      if (userRole === 'superadmin') col = 'superadmins';
      else if (userRole === 'manajemen') col = 'companyAdmins';

      await updateDoc(doc(db, col, userId), data);
      setCurrentUser((prev: any) => prev ? { ...prev, ...data } : null);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!firebaseUser?.email) return { success: false, error: "User tidak ditemukan." };
    setIsLoading(true);
    try {
        const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);
        await updatePassword(firebaseUser, newPassword);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    } finally {
        setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, firebaseUser, userRole, isLoading, setIsLoading, isLoggingOut, 
        loginWithEmail, loginWithGoogle, loginWithPhone, verifyOtp, 
        registerCompanyAccount, activateEmployeeAccount, addUserAsAdmin, addCompanyAdmin,
        sendPasswordReset, updateUserProfile, updateUserPassword, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
