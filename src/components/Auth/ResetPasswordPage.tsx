import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';
import { Lock, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface Props {
  onNavigate: (route: string) => void;
}

export const ResetPasswordPage: React.FC<Props> = ({ onNavigate }) => {
  const { resetPassword } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(password);
      if (res.success) {
        setStatusMessage('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          onNavigate('/login');
        }, 1500);
      } else {
        setErrorMessage(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex justify-between items-center mb-6">
        <button
          onClick={() => onNavigate('/login')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{t('auth.backToLogin')}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <NajmAlHudaLogo className="h-10 w-auto mx-auto" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {t('auth.resetTitle')}
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              {t('auth.resetSubtitle')}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('auth.password')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password ?? ''}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('auth.confirmPassword')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword ?? ''}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1875bb] hover:bg-[#135d96] text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('auth.updatePassword')}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-slate-600">
            <button
              onClick={() => onNavigate('/login')}
              className="text-[#1875bb] font-bold hover:underline cursor-pointer"
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
