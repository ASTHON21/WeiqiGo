
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
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
 * 强化版身份管理钩子
 * 集成了 Firebase 匿名登录与设备指纹，确保 Firestore 安全规则中的 request.auth 有效。
 */
export function useUser() {
  const { firestore, auth } = useFirebase();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !auth) return;

    const initializeIdentity = async () => {
      try {
        // 1. 获取设备指纹作为本地识别参考
        const fp = await FingerprintJS.load();
        const fpResult = await fp.get();
        const deviceId = fpResult.visitorId;

        // 2. 启用 Firebase 匿名登录
        // 只有这样，Firestore 安全规则中的 request.auth 才会生效，防止攻击者通过控制台直接伪造请求
        const authResult = await signInAnonymously(auth);
        const uid = authResult.user.uid;

        // 3. 同步用户档案
        const userRef = doc(firestore, "userProfiles", uid);
        const userSnap = await getDoc(userRef);

        let displayName = localStorage.getItem('tempDisplayName');

        if (userSnap.exists()) {
          const data = userSnap.data();
          if (!displayName) displayName = data.displayName;

          await setDoc(userRef, { 
            lastLoginAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            deviceId: deviceId, // 更新最新的设备指纹
            displayName: displayName || data.displayName
          }, { merge: true });

          setUser({ 
            uid: uid, 
            displayName: displayName || data.displayName || "匿名棋手",
            deviceId: deviceId
          });
        } else {
          // 初始化新档案
          if (!displayName) {
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            displayName = `棋手-${randomSuffix}`;
            localStorage.setItem('tempDisplayName', displayName);
          }

          await setDoc(userRef, {
            id: uid,
            displayName: displayName,
            deviceId: deviceId,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            acceptingInvites: true
          });

          setUser({ uid, displayName, deviceId });
        }
      } catch (error) {
        console.error("Critical Security Failure during Identity Initialization:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeIdentity();
  }, [firestore, auth]);

  return { user, loading };
}
