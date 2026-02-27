
'use client';

import { useState, useEffect } from 'react';
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
 * React hook to manage a persistent player identity based on device fingerprint.
 * Removes Firebase Anonymous Auth dependency.
 */
export function useUser() {
  const { firestore } = useFirebase();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const initializeIdentity = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const deviceId = result.visitorId;

        // 直接使用设备指纹作为用户 UID
        const userRef = doc(firestore, "userProfiles", deviceId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const lastLoginAt = data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt);
          const now = new Date();
          
          // 检查是否超过 3 天未活跃 (3 * 24 * 60 * 60 * 1000)
          const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
          if (now.getTime() - lastLoginAt.getTime() > threeDaysInMs) {
            console.log("检测到设备指纹账号超过3天未活跃，正在执行自动清理...");
            
            // 物理删除云端数据
            await deleteDoc(userRef);
            
            // 清除本地缓存
            localStorage.removeItem('tempDisplayName');
            
            // 重新初始化
            window.location.reload();
            return;
          }

          // 未过期，刷新登录时间与活跃心跳
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
        console.error("Fingerprint identification failed", error);
      } finally {
        setLoading(false);
      }
    };

    initializeIdentity();
  }, [firestore]);

  return { user, loading };
}
