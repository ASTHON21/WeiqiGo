'use client';

import { useState, useEffect } from 'react';

/**
 * 棋手身份接口
 */
export interface SessionUser {
  uid: string;
  displayName: string;
}

/**
 * React hook to manage a one-time player identity using sessionStorage.
 * This ID persists through refreshes but is cleared when the tab is closed.
 */
export function useUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. 尝试从 sessionStorage 获取现有身份
    const storedId = sessionStorage.getItem('tempPlayerId');
    const storedName = sessionStorage.getItem('tempDisplayName');

    if (storedId && storedName) {
      setUser({ uid: storedId, displayName: storedName });
      setLoading(false);
    } else {
      // 2. 如果没有，生成新的匿名身份
      const newId = crypto.randomUUID();
      // 生成一个具有围棋韵味的随机昵称后缀
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newName = `棋手-${randomSuffix}`;

      sessionStorage.setItem('tempPlayerId', newId);
      sessionStorage.setItem('tempDisplayName', newName);

      setUser({ uid: newId, displayName: newName });
      setLoading(false);
    }
  }, []);

  return { user, loading, error: null };
}
