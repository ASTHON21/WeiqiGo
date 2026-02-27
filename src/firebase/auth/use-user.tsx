'use client';

import { useState, useEffect } from 'react';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
 * React hook to manage a persistent player identity with auto-deletion after 3 days of inactivity.
 */
export function useUser() {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) return;

    const initializeIdentity = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const deviceId = result.visitorId;

      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const userRef = doc(firestore, "userProfiles", fbUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            const lastLoginAt = data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt);
            const now = new Date();
            
            // 严格检查是否超过 3 天未活跃 (3 * 24 * 60 * 60 * 1000)
            const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
            if (now.getTime() - lastLoginAt.getTime() > threeDaysInMs) {
              console.log("检测到账号超过3天未活跃，正在执行自动销户...");
              
              // 1. 物理删除云端数据
              await deleteDoc(userRef);
              
              // 2. 清除本地缓存
              localStorage.removeItem('tempDisplayName');
              localStorage.removeItem('tempPlayerId');
              
              // 3. 提示并重新加载以获取新身份
              window.location.reload();
              return;
            }

            // 未过期，刷新登录时间与活跃心跳
            await setDoc(userRef, { 
              lastLoginAt: serverTimestamp(),
              lastSeen: serverTimestamp(),
              deviceId: deviceId,
              displayName: localStorage.getItem('tempDisplayName') || data.displayName // 允许本地同步改名
            }, { merge: true });

            setUser({ 
              uid: fbUser.uid, 
              displayName: localStorage.getItem('tempDisplayName') || data.displayName || "匿名棋手",
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
              id: fbUser.uid,
              displayName: displayName,
              deviceId: deviceId,
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
              lastSeen: serverTimestamp(),
              acceptingInvites: true
            });

            setUser({ uid: fbUser.uid, displayName, deviceId });
          }
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
