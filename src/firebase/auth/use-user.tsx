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
        // 获取持久化存储的昵称，如果没有则生成
        let displayName = localStorage.getItem('tempDisplayName');
        if (!displayName) {
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          displayName = `棋手-${randomSuffix}`;
          localStorage.setItem('tempDisplayName', displayName);
        }
        
        setUser({ 
          uid: fbUser.uid, 
          displayName: displayName 
        });
        setLoading(false);
      } else {
        // 如果未认证，执行匿名登录
        try {
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
