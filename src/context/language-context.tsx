
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  zh: {
    'nav.home': '首页',
    'nav.about': '关于',
    'home.title': 'WEIQI GO',
    'home.subtitle': '“博弈之间，见天地，见众生。”',
    'home.practice.title': '本地练棋 (Practice)',
    'home.practice.desc': '一人分饰两角，研磨定式，探索棋道变化。',
    'home.practice.size': '选择棋盘尺寸',
    'home.practice.rule': '选择竞技规则',
    'home.practice.start': '开始对局',
    'home.viewer.title': 'SGF 导入 (Viewer)',
    'home.viewer.desc': '上传 SGF 棋谱文件，线性查看对局进程，锁定交互。',
    'home.viewer.info': '支持 .sgf 格式。支持步进控制与重置，纯净阅览无干预。',
    'home.viewer.start': '进入阅览',
    'home.online.title': '竞技大厅 (Lobby)',
    'home.online.desc': '查看实时在线玩家，发起对局挑战，或观摩 1 小时内完赛的名局。',
    'home.online.accept': '接受邀请',
    'home.online.decline': '不接受邀请',
    'home.online.start': '进入大厅',
    'home.rules.btn': '规则说明',
    'home.announcement.btn': '系统公告',
    'home.announcement.title': '版本更新说明',
    'rules.chinese': '中国规则',
    'rules.territory': '日韩规则',
    'lobby.tab.players': '活跃棋手',
    'lobby.tab.recent': '名局回放 (1h)',
    'lobby.game.winner': '胜',
    'lobby.game.view': '进入观摩'
  },
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
    'home.title': 'WEIQI GO',
    'home.subtitle': '"Between moves, see heaven, see earth, see all living beings."',
    'home.practice.title': 'Practice Mode',
    'home.practice.desc': 'Play both sides, study patterns, and explore variations.',
    'home.practice.size': 'Select Board Size',
    'home.practice.rule': 'Select Rules',
    'home.practice.start': 'Start Practice',
    'home.viewer.title': 'SGF Viewer',
    'home.viewer.desc': 'Upload SGF files to review games step-by-step with locked interaction.',
    'home.viewer.info': 'Supports .sgf format. Precise navigation and reset controls.',
    'home.viewer.start': 'Enter Viewer',
    'home.online.title': 'Competition Lobby',
    'home.online.desc': 'Find online players, send challenges, or spectate games finished within 1 hour.',
    'home.online.accept': 'Accept Invites',
    'home.online.decline': 'Decline Invites',
    'home.online.start': 'Enter Lobby',
    'home.rules.btn': 'Rule Guide',
    'home.announcement.btn': 'Announcements',
    'home.announcement.title': 'Release Notes',
    'rules.chinese': 'Chinese Rules',
    'rules.territory': 'Japanese Rules',
    'lobby.tab.players': 'Active Players',
    'lobby.tab.recent': 'Recent Replays (1h)',
    'lobby.game.winner': 'Win',
    'lobby.game.view': 'View Game'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh');

  useEffect(() => {
    const saved = localStorage.getItem('appLanguage') as Language;
    if (saved && (saved === 'zh' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('appLanguage', lang);
  };

  const t = (key: string) => {
    return (translations[language] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
