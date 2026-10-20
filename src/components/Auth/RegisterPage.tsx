import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Globe
} from 'lucide-react';

interface Props {
  onNavigate: (route: string) => void;
}

export const RegisterPage: React.FC<Props> = ({ onNavigate }) => {
  const { register } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'service_advisor' as UserRole,
    password: '',
    confirmPassword: '',
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        phone: formData.phone,
      });

      if (res.success) {
        setSuccessMessage('Account created successfully! Redirecting to system workspace...');
        setTimeout(() => {
          onNavigate('/app');
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to create account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-lg flex justify-between items-center mb-6">
        <button
          onClick={() => onNavigate('/login')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{t('auth.backToLogin')}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <NajmAlHudaLogo className="h-10 w-auto mx-auto" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {t('auth.registerTitle')}
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              {t('auth.registerSubtitle')}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('auth.fullName')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.fullName ?? ''}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Salim Al-Kuwari"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.email')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email ?? ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@workshop.qa"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.phone')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone ?? ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+974 5511 2233"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('auth.role')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <select
                  value={formData.role ?? ''}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                >
                  <option value="service_advisor">Service Advisor (استقبال وفتح بطاقات العمل)</option>
                  <option value="technician">Technician / Mechanic (فني ورشة وفحص)</option>
                  <option value="parts_manager">Parts Manager (مسؤول مستودع قطع الغيار)</option>
                  <option value="cashier">Cashier (أمين صندوق ومحاسبة وفواتير)</option>
                  <option value="manager">Workshop Manager (مدير الورشة والعمليات)</option>
                  <option value="customer">Client / Customer (عميل لمتابعة المركبة)</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.password')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.password ?? ''}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.confirmPassword')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword ?? ''}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#1875bb] hover:bg-[#135d96] text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('auth.signUp')}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-slate-600">
            <span>{t('auth.haveAccount')} </span>
            <button
              onClick={() => onNavigate('/login')}
              className="text-[#1875bb] font-bold hover:underline cursor-pointer"
            >
              {t('auth.signIn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
