import { ArrowRight, ArrowLeft, LogOut, Globe } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../stores/authStore';
import { logout } from '../../services/authService';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showLogout?: boolean;
  showLanguage?: boolean;
  onBack?: () => void;
}

export function Header({
  title,
  showBack = false,
  showLogout = true,
  showLanguage = true,
  onBack,
}: HeaderProps) {
  const { t, language, changeLanguage, isRTL } = useTranslation();
  const { profile, reset } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    reset();
  };

  const handleLanguageToggle = () => {
    changeLanguage(language === 'he' ? 'en' : 'he');
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <header className="flex items-center justify-between mb-6 py-2">
      {/* Left side - Back button or Logo */}
      <div className="flex items-center gap-3">
        {showBack && onBack ? (
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-card-bg transition-colors"
            aria-label={t('back')}
          >
            <BackArrow className="w-6 h-6 text-gold" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Royal Cash" className="w-8 h-8" />
            <span className="text-xl font-bold text-gold hidden sm:inline">Royal Cash</span>
          </div>
        )}

        {title && <h1 className="text-xl font-bold text-gold">{title}</h1>}
      </div>

      {/* Right side - User menu */}
      <div className="flex items-center gap-3">
        {/* Language toggle */}
        {showLanguage && (
          <button
            onClick={handleLanguageToggle}
            className="p-2 rounded-full hover:bg-card-bg transition-colors"
            aria-label="Change language"
            title={language === 'he' ? 'Switch to English' : 'עבור לעברית'}
          >
            <Globe className="w-5 h-5 text-muted hover:text-gold" />
          </button>
        )}

        {/* User profile */}
        {profile && (
          <span className="text-sm text-muted hidden sm:inline">
            {profile.username}
          </span>
        )}

        {/* Logout button */}
        {showLogout && profile && (
          <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-card-bg transition-colors"
            aria-label={t('logout')}
            title={t('logout')}
          >
            <LogOut className="w-5 h-5 text-muted hover:text-danger" />
          </button>
        )}
      </div>
    </header>
  );
}
