
'use client';

import { useState, useEffect } from 'react';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
 * React hook to manage a persistent player identity.
 * Uses FingerprintJS for device recognition and Firestore for profile persistence.
 */
export function useUser() {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) return;

    const initializeIdentity = async () => {
      // 1. 获取设备指纹
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const deviceId = result.visitorId;

      // 2. 监听 Auth 状态
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          // 检查 Firestore 是否已有该 UID 的档案
          const userRef = doc(firestore, "userProfiles", fbUser.uid);
          const userSnap = await getDoc(userRef);

          let displayName = localStorage.getItem('tempDisplayName');
          
          if (!userSnap.exists()) {
            // 如果是新用户，初始化档案
            if (!displayName) {
              const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
              displayName = `棋手-${randomSuffix}`;
              localStorage.setItem('tempDisplayName', displayName);
            }

            await setDoc(userRef, {
              id: fbUser.uid,
              displayName: displayName,
              deviceId: deviceId,
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
              lastSeen: serverTimestamp(),
              acceptingInvites: true
            }, { merge: true });
          } else {
            // 已有档案，更新最后登录时间
            displayName = userSnap.data().displayName || displayName;
            await setDoc(userRef, { 
              lastLoginAt: serverTimestamp(),
              deviceId: deviceId, // 确保指纹同步
              lastSeen: serverTimestamp()
            }, { merge: true });
          }

          setUser({ 
            uid: fbUser.uid, 
            displayName: displayName || "未知棋手",
            deviceId: deviceId
          });
          setLoading(false);
        } else {
          try {
            await signInAnonymously(auth);
          } catch (error) {
            console.error("Anonymous sign-in failed", error);
            setLoading(false);
          }
        }
      });

      return unsubscribe;
    };

    let authUnsubscribe: (() => void) | undefined;
    initializeIdentity().then(unsub => {
      authUnsubscribe = unsub;
    });

    return () => {
      if (authUnsubscribe) authUnsubscribe();
    };
  }, [auth, firestore]);

  return { user, loading };
}
