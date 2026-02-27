
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * 棋手身份接口
 */
export interface SessionUser {
  uid: string;
  displayName: string;
  deviceId: string;
}

/**
 * React hook to manage a persistent player identity based on device fingerprint.
 * Decoupled from Firebase Auth to prevent permission conflicts.
 */
export function useUser() {
  const { firestore, auth } = useFirebase();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !auth) return;

    const initializeIdentity = async () => {
      try {
        // 1. 强制清理任何残留的 Firebase Auth 会话，确保请求不携带过期的 Auth Context
        if (auth.currentUser) {
          await signOut(auth);
        }

        // 2. 获取设备唯一指纹
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const deviceId = result.visitorId;

        // 3. 直接使用指纹 ID 作为用户 UID
        const userRef = doc(firestore, "userProfiles", deviceId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const lastLoginAt = data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt);
          const now = new Date();
          
          // 检查是否超过 3 天未活跃 (3 * 24 * 60 * 60 * 1000)
          const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
          if (now.getTime() - lastLoginAt.getTime() > threeDaysInMs) {
            await deleteDoc(userRef);
            localStorage.removeItem('tempDisplayName');
            window.location.reload();
            return;
          }

          // 刷新活跃状态
          let displayName = localStorage.getItem('tempDisplayName') || data.displayName;
          await setDoc(userRef, { 
            lastLoginAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            displayName: displayName
          }, { merge: true });

          setUser({ 
            uid: deviceId, 
            displayName: displayName || "匿名棋手",
            deviceId: deviceId
          });
        } else {
          // 初始化新档案
          let displayName = localStorage.getItem('tempDisplayName');
          if (!displayName) {
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            displayName = `棋手-${randomSuffix}`;
            localStorage.setItem('tempDisplayName', displayName);
          }

          await setDoc(userRef, {
            id: deviceId,
            displayName: displayName,
            deviceId: deviceId,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            acceptingInvites: true
          });

          setUser({ uid: deviceId, displayName, deviceId });
        }
      } catch (error) {
        console.error("Identity initialization failed:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeIdentity();
  }, [firestore, auth]);

  return { user, loading };
}
