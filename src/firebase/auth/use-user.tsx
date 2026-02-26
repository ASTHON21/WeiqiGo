'use client';

import { useState, useEffect } from 'react';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { useFirebase } from '@/firebase';

/**
 * 棋手身份接口
 */
export interface SessionUser {
  uid: string;
  displayName: string;
  persistedId: string; // 网页分发的持久化 ID
}

/**
 * React hook to manage a persistent player identity using Firebase Anonymous Auth and localStorage.
 * This ensures backend security rules work while maintaining the "no-login" UX across browser restarts.
 */
export function useUser() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    // 监听身份变化
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // 1. 检测 LocalStorage 是否已拥有网页分发的棋手 ID (tempPlayerId)
        let persistedId = localStorage.getItem('tempPlayerId');
        
        // 2. 检测 LocalStorage 昵称 (tempDisplayName)
        let displayName = localStorage.getItem('tempDisplayName');
        
        // 如果是新设备/新用户，初始化持久化 ID
        if (!persistedId) {
          persistedId = fbUser.uid;
          localStorage.setItem('tempPlayerId', persistedId);
        }

        // 初始化昵称
        if (!displayName) {
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          displayName = `棋手-${randomSuffix}`;
          localStorage.setItem('tempDisplayName', displayName);
        }
        
        setUser({ 
          uid: fbUser.uid, 
          displayName: displayName,
          persistedId: persistedId // 返回分发的 ID 供业务逻辑参考
        });
        setLoading(false);
      } else {
        // 如果未认证，执行匿名登录
        try {
          // Firebase 默认会将 Anonymous 凭据持久化
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous sign-in failed", error);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, loading, error: null };
}
