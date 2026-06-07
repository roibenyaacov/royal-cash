import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';
import { checkAuth, onAuthStateChange } from './services/authService';
import { ToastProvider } from './components/common/Toast';
import { Loading } from './components/common/Loading';
import { AuthPage } from './pages/AuthPage';
import { LobbyPage } from './pages/LobbyPage';
import TablePage from './pages/TablePage';
import SettlementPage from './pages/SettlementPage';
import StatsPage from './pages/StatsPage';
import { ViewType } from './types';

function App() {
  const {
    user,
    isLoading,
    isInitialized,
    setUser,
    setProfile,
    setSession,
    setIsLoading,
    setIsInitialized,
  } = useAuthStore();

  const { language } = useSettingsStore();

  const [currentView, setCurrentView] = useState<ViewType>('loading');
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { session, profile } = await checkAuth();

        if (session) {
          setUser(session.user);
          setSession(session);
          setProfile(profile);
          setCurrentView('lobby');
        } else {
          setCurrentView('auth');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setCurrentView('auth');
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initAuth();

    // Set up auth state listener
    const {
      data: { subscription },
    } = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);

      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setSession(session);
        setCurrentView('lobby');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setProfile(null);
        setCurrentView('auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Apply language direction
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  }, [language]);

  // Handle URL params (for joining table via link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get('table');

    if (tableId && user) {
      setActiveTableId(tableId);
      setCurrentView('table');
    }
  }, [user]);

  const handleOpenTable = (tableId: string) => {
    setActiveTableId(tableId);
    setCurrentView('table');

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('table', tableId);
    window.history.pushState({}, '', url);
  };

  const handleBackToLobby = () => {
    setActiveTableId(null);
    setCurrentView('lobby');

    // Clear URL params
    const url = new URL(window.location.href);
    url.searchParams.delete('table');
    window.history.pushState({}, '', url);
  };

  const handleOpenStats = () => {
    setCurrentView('stats');
  };

  const handleNavigate = (view: ViewType, tableId?: string) => {
    if (view === 'lobby') {
      handleBackToLobby();
    } else if (view === 'table' && tableId) {
      handleOpenTable(tableId);
    } else if (view === 'settle' && tableId) {
      setActiveTableId(tableId);
      setCurrentView('settle');
    } else if (view === 'stats') {
      setCurrentView('stats');
    } else if (view === 'summary' && tableId) {
      setActiveTableId(tableId);
      setCurrentView('summary');
    } else {
      setCurrentView(view);
    }
  };

  // Loading state
  if (isLoading || !isInitialized) {
    return (
      <ToastProvider>
        <Loading fullScreen text="טוען..." />
      </ToastProvider>
    );
  }

  // Auth state
  if (!user) {
    return (
      <ToastProvider>
        <AuthPage />
      </ToastProvider>
    );
  }

  // Render based on current view
  return (
    <ToastProvider>
      {currentView === 'lobby' && (
        <LobbyPage onOpenTable={handleOpenTable} onOpenStats={handleOpenStats} />
      )}

      {currentView === 'table' && activeTableId && (
        <TablePage tableId={activeTableId} onNavigate={handleNavigate} />
      )}

      {currentView === 'settle' && activeTableId && (
        <SettlementPage tableId={activeTableId} onNavigate={handleNavigate} />
      )}

      {currentView === 'stats' && (
        <StatsPage onNavigate={handleNavigate} />
      )}
    </ToastProvider>
  );
}

export default App;
