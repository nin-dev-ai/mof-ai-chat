import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WeaveAiChat } from '../components/WeaveAiChat';
import { Login } from '../components/Login';
import { HistoryItem } from '../models/startup';
import { isMofEmail, MOF_EMAIL_ERROR, normalizeMofEmail } from '../utils/mofEmail';
import {
  AUTH_SESSION_CHANGED_EVENT,
  configureAuthSession,
  getStoredSession,
  loginWithPassword,
  logoutAuthSession,
  refreshAuthSession,
  signupWithPassword,
} from '../services/authSession';
import { GOTRUE_URL } from '../constants/chatConstants';
import '../styles/input.css';
import '../i18n';

const API_BASE_URL = 'https://uat-esolutions.solutionsplus.ae';

configureAuthSession({ baseUrl: GOTRUE_URL });

const THEME_COLORS = {
  primary: '#C6A75D',
  secondary: '#B8985A',
  accent: '#E5D4A6',
};

function readStoredAuth(): { token: string | null; user: any } {
  const session = getStoredSession();
  return { token: session?.accessToken || null, user: session?.user ?? null };
}

const App = () => {
  const [isArabic, setIsArabic] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [{ token: authToken, user: currentUser }, setAuth] = useState(readStoredAuth);
  const [restoringSession, setRestoringSession] = useState(true);

  useEffect(() => {
    const syncAuth = () => {
      const next = readStoredAuth();
      setAuth(previous => {
        const sameToken = previous.token === next.token;
        const sameUser = JSON.stringify(previous.user) === JSON.stringify(next.user);
        return sameToken && sameUser ? previous : next;
      });
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuth);

    refreshAuthSession(false).finally(() => {
      syncAuth();
      setRestoringSession(false);
    });

    const refreshTimer = window.setInterval(() => {
      refreshAuthSession(false).then(syncAuth);
    }, 30_000);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuth);
      window.clearInterval(refreshTimer);
    };
  }, []);

  const apiConfig = useMemo(() => ({
    baseUrl: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Token: authToken || '',
    },
  }), [authToken]);

  const checkHistoryItemExists = useCallback((weaveChatid: number): boolean => {
    return historyItems.some(item => {
      const sessionId = typeof item.session === 'object' ? item.session.id : parseInt(item.id, 10);
      return sessionId === weaveChatid;
    });
  }, [historyItems]);

  const addHistoryItem = useCallback((item: HistoryItem) => {
    setHistoryItems(prev => {
      if (!prev.some(existing => existing.id === item.id)) {
        return [...prev, item];
      }
      return prev;
    });
  }, []);

  const handleLogout = async () => {
    await logoutAuthSession();
    setAuth({ token: null, user: null });
  };

  const handleLogin = async (username: string, password: string) => {
    const email = normalizeMofEmail(username);
    if (!isMofEmail(email)) throw new Error(MOF_EMAIL_ERROR);

    const session = await loginWithPassword(email, password);
    setAuth({ token: session.accessToken, user: session.user });
  };

  const handleSignUp = async (username: string, password: string, fullName: string) => {
    const email = normalizeMofEmail(username);
    if (!isMofEmail(email)) throw new Error(MOF_EMAIL_ERROR);
    const name = fullName.trim().replace(/\s+/g, ' ');
    if (name.length < 2) throw new Error('Please enter your full name');

    const session = await signupWithPassword(email, password, name);
    setAuth({ token: session.accessToken, user: session.user });
  };

  if (restoringSession) return null;

  if (!authToken) {
    return <Login onLogin={handleLogin} onSignUp={handleSignUp} themeColors={THEME_COLORS} />;
  }

  return (
    <div className="h-screen bg-gray-100">
      <WeaveAiChat
        apiConfig={apiConfig}
        placeholder="Ask a question or start a task"
        onViewAIServicesClose={() => {}}
        OnWebSocketEvent={() => {}}
        isAIServicesCloseButtonVisible={false}
        sideMenuCloseDefault={false}
        IsMobile={false}
        IsArabicLanguage={isArabic}
        onLanguageChange={setIsArabic}
        userEmail={currentUser?.email || currentUser?.username || ''}
        currentUser={{
          employee_name:
            currentUser?.employee_name ||
            currentUser?.full_name ||
            currentUser?.user_metadata?.employee_name ||
            currentUser?.user_metadata?.full_name ||
            currentUser?.username,
          job_title: currentUser?.job_title || currentUser?.department,
          department: currentUser?.department,
          email: currentUser?.email || currentUser?.username,
        }}
        checkHistoryItemExists={checkHistoryItemExists}
        addHistoryItem={addHistoryItem}
        userAvatarBase64=""
        userAvatarUrl=""
        themeColors={THEME_COLORS}
        onLogout={handleLogout}
      />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
