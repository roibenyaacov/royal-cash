import { useState } from 'react';
import { Globe, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { login, signup } from '../services/authService';
import { Button, Input } from '../components/common';
import { useToast } from '../components/common/Toast';

type AuthTab = 'login' | 'signup';

export function AuthPage() {
  const { t, language, changeLanguage } = useTranslation();
  const { setUser, setProfile, setSession } = useAuthStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showToast(t('fillAllFields'), 'error');
      return;
    }

    setIsLoading(true);

    try {
      const { user, session, profile, error } = await login({ email, password });

      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast(errorMessage || t('error'), 'error');
        return;
      }

      if (user && session) {
        setUser(user);
        setSession(session);
        setProfile(profile);
        showToast(t('login') + ' ✓', 'success');
      }
    } catch (error: any) {
      showToast(error.message || t('error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !username || !phone) {
      showToast(t('fillAllFields'), 'error');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error } = await signup({ email, password, username, phone });

      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast(errorMessage || t('error'), 'error');
        return;
      }

      if (user) {
        // After signup, user needs to log in
        showToast('נרשמת בהצלחה! כעת התחבר', 'success');
        setActiveTab('login');
      }
    } catch (error: any) {
      showToast(error.message || t('error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center p-4">
      {/* Language selector */}
      <button
        onClick={() => changeLanguage(language === 'he' ? 'en' : 'he')}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-card-bg transition-colors"
      >
        <Globe className="w-6 h-6 text-muted hover:text-gold" />
      </button>

      {/* Logo */}
      <div className="text-center mb-8">
        <img src="/logo.png" alt="Royal Cash" className="w-20 h-20 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gold">Royal Cash</h1>
        <p className="text-muted mt-2">League Edition</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm">
        {/* Tabs */}
        <div className="flex mb-6">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            {t('login')}
          </button>
          <button
            className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            {t('signup')}
          </button>
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <Input
              type="email"
              placeholder={t('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full p-3 bg-black border border-gray-700 text-white rounded-lg
                  focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20
                  placeholder:text-muted"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-gold"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button type="submit" isLoading={isLoading}>
              {t('loginBtn')}
            </Button>
          </form>
        )}

        {/* Signup Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup}>
            <Input
              type="text"
              placeholder={t('username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />

            <Input
              type="email"
              placeholder={t('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <Input
              type="tel"
              placeholder={t('phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />

            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full p-3 bg-black border border-gray-700 text-white rounded-lg
                  focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20
                  placeholder:text-muted"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-gold"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button type="submit" isLoading={isLoading}>
              {t('signupBtn')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
