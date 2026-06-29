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
import type { Employee, UserRole, Company } from '@/types';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, updateDoc, DocumentData, UpdateData, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { sendTemplatedEmail, sendPasswordResetEmailWithSmtp, notifyAdminNewRegistration, sendWelcomeWhatsApp } from '@/lib/services/notification-service';
import { addDays, format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

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
  currentUser: Employee | null;
  firebaseUser: User | null;
  userRole: UserRole;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isLoggingOut: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: ( ) => Promise<{ success: boolean; error?: string }>;
  loginWithPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
  registerCompanyAccount: (data: CompanyRegistrationData) => Promise<{ success: boolean; error?: string; message?: string }>;
  activateEmployeeAccount: (data: EmployeeActivationData) => Promise<{ success: boolean; error?: string; message?: string }>;
  addUserAsAdmin: (employeeData: Omit<Employee, 'id' | 'loginStatus'>, sendInvitationEmail?: boolean, silent?: boolean) => Promise<{ success: boolean; error?: string; message?: string }>;
  sendPasswordReset: (email: string, isSilent?: boolean) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (userId: string, data: UpdateData<DocumentData>) => Promise<{ success: boolean; error?: string }>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
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
        const userDocRef = doc(db, 'employees', user.uid);
        let userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            const userIdentifier = user.email?.toLowerCase() || user.phoneNumber;
            if (userIdentifier) {
                const identifierField = user.email ? "email" : "phone";
                const q = query(collection(db, "employees"), where(identifierField, "==", userIdentifier));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    userDoc = querySnapshot.docs[0];
                    await updateDoc(userDoc.ref, { authUid: user.uid });
                }
            }
        }
        
        if (userDoc.exists()) {
          const userProfile = { ...userDoc.data(), id: userDoc.id } as Employee;
          
          if (userProfile.status === 'Menunggu Persetujuan') {
              router.replace(`/activate?name=${encodeURIComponent(userProfile.name)}&company=${encodeURIComponent(userProfile.company)}&email=${encodeURIComponent(userProfile.email)}`);
              setIsLoading(false);
              return;
          }

          if (userProfile.loginStatus === 'Invited') {
              await updateDoc(userDoc.ref, { loginStatus: 'Active' });
              userProfile.loginStatus = 'Active';
          }

          setCurrentUser(userProfile);
          setUserRole(userProfile.role);
          setFirebaseUser(user);
        } else {
            await signOut(auth);
            setCurrentUser(null);
            setFirebaseUser(null);
            setUserRole(null);
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
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (!user.email) throw new Error('Email tidak ditemukan.');
  
      const q = query(collection(db, 'employees'), where('email', '==', user.email.toLowerCase()));
      const snapshot = await getDocs(q);
  
      if (snapshot.empty) {
        await signOut(auth);
        setIsLoading(false);
        return { success: false, error: 'Akun Anda belum terdaftar di sistem.' };
      }
  
      await updateDoc(snapshot.docs[0].ref, { authUid: user.uid, loginStatus: 'Active' });
      return { success: true };
    } catch (e: any) {
      console.error("Error during Google login:", e);
      setIsLoading(false);
      return { success: false, error: e.message };
    }
  };

  const loginWithPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        window.confirmationResult = confirmationResult;
        setIsLoading(false);
        return { success: true };
    } catch (error: any) {
        console.error("Error during phone sign-in:", error);
        setIsLoading(false);
        return { success: false, error: error.message };
    }
  };

  const verifyOtp = async (otp: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
        if (window.confirmationResult) {
            await window.confirmationResult.confirm(otp);
            return { success: true };
        }
        throw new Error('Konfirmasi OTP hilang.');
    } catch (error: any) {
        console.error("Error verifying OTP:", error);
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
        });

        const employeeRef = doc(db, "employees", newUser.uid);
        batch.set(employeeRef, {
            name: data.name,
            email: data.email.toLowerCase().trim(),
            phone: data.phone,
            company: data.companyName,
            department: "Manajemen",
            position: "Admin Perusahaan",
            level: 'Staff',
            joinDate: now.toISOString().split("T")[0],
            status: "Aktif",
            role: "manajemen",
            loginStatus: "Active",
            authUid: newUser.uid,
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
            performedBy: 'System',
            timestamp: serverTimestamp(),
        });
        
        await batch.commit();
        
        // --- NOTIFIKASI DENGAN TRY-CATCH INDIVIDU ---
        // Kita gunakan try-catch terpisah agar kegagalan Email tidak membatalkan WA, dan sebaliknya.
        
        try {
            await sendTemplatedEmail(data.email, 'registration', {
                nama_pengguna: data.name,
                company_name: data.companyName,
                link: window.location.origin + '/login'
            });
        } catch (err) {
            console.error("[REG_NOTIF] Email pendaftar gagal:", err);
        }

        try {
            await sendWelcomeWhatsApp({
                name: data.name,
                phone: data.phone,
                companyName: data.companyName
            });
        } catch (err) {
            console.error("[REG_NOTIF] WA pendaftar gagal:", err);
        }

        try {
            await notifyAdminNewRegistration({
                name: data.name,
                email: data.email,
                companyName: data.companyName,
                phone: data.phone
            });
        } catch (err) {
            console.error("[REG_NOTIF] Notifikasi Admin gagal:", err);
        }

        await signOut(auth);
        
        return { success: true, message: "Pendaftaran berhasil dan akun Anda sudah AKTIF (Trial 14 hari)! Silakan login." };
    } catch (e: any) {
        console.error("Error during company registration:", e);
        if (newUser) await deleteUser(newUser).catch((deleteError) => console.error("Failed to clean up user after registration error:", deleteError));
        setIsLoading(false);
        return { success: false, error: e.message };
    }
  };

  const activateEmployeeAccount = async (data: EmployeeActivationData): Promise<{ success: boolean; error?: string; message?: string }> => {
    return { success: true, message: "Akun siap diaktivasi." };
  };

  const addUserAsAdmin = async (employeeData: Omit<Employee, 'id' | 'loginStatus'>, sendInvitationEmail = false, silent = false): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!silent) setIsLoading(true);
    const tempApp = initializeApp(auth.app.options, `temp-${Date.now()}`);
    const tempAuth = getAuth(tempApp);
    
    try {
      const email = employeeData.email.toLowerCase().trim();
      const tempPassword = Math.random().toString(36).slice(-10);
  
      const existingUserQuery = query(collection(db, 'employees'), where('email', '==', email));
      const existingUserSnap = await getDocs(existingUserQuery);
      if (!existingUserSnap.empty) {
          return { success: false, error: 'Email sudah terdaftar.' };
      }
      
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, tempPassword);
      const newUser = userCredential.user;
  
      await setDoc(doc(db, 'employees', newUser.uid), {
        ...employeeData,
        email,
        authUid: newUser.uid,
        loginStatus: sendInvitationEmail ? 'Invited' : 'No Login',
      });

      if (sendInvitationEmail) {
        await sleep(2000); 
        await sendPasswordReset(email, true); 
      }
      
      return { success: true, message: `Berhasil menambahkan ${employeeData.name}.` };
    } catch (error: any) {
      console.error("Error in addUserAsAdmin:", error);
      console.error(error);
      return { success: false, error: error.message };
    } finally {
      await signOut(tempAuth).catch(() => {});
      await deleteApp(tempApp).catch(() => {});
      if (!silent) setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string, isSilent = false): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.toLowerCase().trim();
    if (!isSilent) setIsLoading(true);
    
    try {
        const userSnap = await getDocs(query(collection(db, 'employees'), where('email', '==', cleanEmail)));
        if (userSnap.empty) {
            return { success: false, error: 'Email tidak terdaftar.' };
        }
        
        const employee = userSnap.docs[0].data() as Employee;
        
        console.log(`[AUTH] Attempting custom SMTP reset for: ${cleanEmail}`);
        const result = await sendPasswordResetEmailWithSmtp(cleanEmail, employee.name);
        
        if (result && result.success) {
            console.log(`[AUTH] Success! SMTP link sent to queue.`);
            await updateDoc(userSnap.docs[0].ref, { loginStatus: 'Invited' });
            return { success: true };
        }

        console.error(`[AUTH] SMTP Failed: ${result?.error}`);
        return { success: false, error: result?.error || "Gagal mengirim via SMTP" };

    } catch(e: any) {
        console.error("Password reset error:", e);
        console.error(e);
        return { success: false, error: e.message };
    } finally {
        if (!isSilent) setIsLoading(false);
    }
  };

  const updateUserProfile = async (userId: string, data: UpdateData<DocumentData>): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'employees', userId);
      await updateDoc(userDocRef, data);
      return { success: true };
    } catch (e: any) {
      console.error("Error updating user profile:", e);
      return { success: false, error: e.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!firebaseUser?.email) return { success: false, error: "User tidak ditemukan." };
    setIsLoading(true);
    try {
        const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);
        await updatePassword(firebaseUser, newPassword);
        return { success: true };
    } catch (e: any) {
        console.error("Error verifying phone code:", e);
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
        registerCompanyAccount, activateEmployeeAccount, addUserAsAdmin, 
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
