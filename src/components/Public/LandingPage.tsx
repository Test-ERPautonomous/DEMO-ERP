import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Wrench, 
  Paintbrush, 
  Package, 
  Recycle, 
  ShieldCheck, 
  Award, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  Car, 
  ChevronRight, 
  ExternalLink,
  Sparkles,
  Layers,
  Send,
  Globe
} from 'lucide-react';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';
import { updateDocumentDirection } from '../../i18n';

interface LandingPageProps {
  onNavigate: (route: string) => void;
  isAuthenticated: boolean;
  currentUserRole?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  isAuthenticated,
  currentUserRole
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // Contact form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    vehicle: '',
    serviceType: 'Mechanical',
    notes: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    updateDocumentDirection(newLang);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const handleWhatsAppDirect = () => {
    const text = encodeURIComponent(
      `Hello Najm Al Huda Garage & Scrap,\n\nI would like to inquire about:\n- Name: ${formData.fullName || 'Customer'}\n- Phone: ${formData.phone || 'N/A'}\n- Vehicle: ${formData.vehicle || 'General Inquiry'}\n- Service: ${formData.serviceType}\n- Notes: ${formData.notes || 'Looking for quote/assistance'}`
    );
    window.open(`https://wa.me/97455112233?text=${text}`, '_blank');
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 font-sans ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* TOP NOTIFICATION / QATAR CR BAR */}
      <div className="bg-slate-900 text-slate-300 text-[12px] py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-white">{t('hero.crNotice')}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 text-xs">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('footer.address')}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('footer.hours')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand Title */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <NajmAlHudaLogo className="h-12 w-auto max-w-[200px]" />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {t('appName')}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {t('tagline')}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-700">
            <a href="#services" className="hover:text-[#1875bb] transition-colors">{t('nav.services')}</a>
            <a href="#why-us" className="hover:text-[#1875bb] transition-colors">{t('nav.whyUs')}</a>
            <a href="#scrap" className="hover:text-[#1875bb] transition-colors">{t('nav.scrapTrading')}</a>
            <a href="#contact" className="hover:text-[#1875bb] transition-colors">{t('nav.contact')}</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Request Service CTA */}
            <a
              href="#contact"
              className="hidden md:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {t('nav.requestService')}
            </a>

            {/* Login / Open ERP Button */}
            {isAuthenticated ? (
              <button
                onClick={() => onNavigate('/app')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1875bb] hover:bg-[#135d96] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>{t('nav.openApp')}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <button
                onClick={() => onNavigate('/login')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>{t('nav.login')}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-[#0f2438] to-slate-900 text-white py-16 lg:py-24">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#1875bb_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('hero.badge')}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {t('hero.title')}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
                {t('hero.description')}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="#contact"
                  className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>{t('hero.bookService')}</span>
                </a>

                <button
                  onClick={handleWhatsAppDirect}
                  className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{t('hero.contactWhatsApp')}</span>
                </button>

                <a
                  href="tel:+97455112233"
                  className="px-5 py-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 text-sky-400" />
                  <span>+974 5511 2233</span>
                </a>
              </div>

              {/* Key Trust Highlights */}
              <div className="pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-xl font-bold text-amber-400">CR: 2026/001</div>
                  <div className="text-[11px] text-slate-400">State of Qatar Licensed</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-xl font-bold text-sky-400">Street 24</div>
                  <div className="text-[11px] text-slate-400">Industrial Area HQ</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-xl font-bold text-emerald-400">Oven Booth</div>
                  <div className="text-[11px] text-slate-400">Heated Paint Chamber</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-xl font-bold text-purple-400">Weighbridge</div>
                  <div className="text-[11px] text-slate-400">Official Scrap Scale</div>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                  <div>
                    <h3 className="text-base font-bold text-white">Najm Al Huda Enterprise Hub</h3>
                    <p className="text-xs text-slate-400">Industrial Area, St. 24 • Doha</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    Open Today
                  </span>
                </div>

                {/* Service Quick Tags */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{t('services.mechanical.title')}</h4>
                      <p className="text-[11px] text-slate-400">Engine Overhauls, Transmission, Suspension & Computer Diagnostics</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Paintbrush className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{t('services.bodyPaint.title')}</h4>
                      <p className="text-[11px] text-slate-400">Chassis Pulling, PDR Dent Removal & Italian Heated Paint Oven</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Recycle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{t('services.scrap.title')}</h4>
                      <p className="text-[11px] text-slate-400">Salvage Vehicle Purchases, Weighbridge Certified Scale & Parts Harvesting</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate(isAuthenticated ? '/app' : '/login')}
                    className="w-full py-3 px-4 rounded-xl bg-[#1875bb] hover:bg-[#1567a5] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>{isAuthenticated ? t('nav.openApp') : t('nav.login')}</span>
                    <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1875bb]">
              {t('services.title')}
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Complete Automotive Care & Salvage Processing
            </p>
            <p className="text-base text-slate-600">
              {t('services.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* 1. Mechanical */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#1875bb] flex items-center justify-center">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('services.mechanical.title')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('services.mechanical.desc')}
              </p>
              <ul className="text-xs text-slate-500 space-y-2 pt-2 border-t border-slate-200">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Computer OBD Diagnostics</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Engine & Gearbox Rebuild</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> AC Compressor & Climate System</li>
              </ul>
            </div>

            {/* 2. Body & Paint */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Paintbrush className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('services.bodyPaint.title')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('services.bodyPaint.desc')}
              </p>
              <ul className="text-xs text-slate-500 space-y-2 pt-2 border-t border-slate-200">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Chassis Alignment Jig</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Paintless Dent Repair (PDR)</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Computer Paint Formulation</li>
              </ul>
            </div>

            {/* 3. Parts */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-sky-400 hover:shadow-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('services.parts.title')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('services.parts.desc')}
              </p>
              <ul className="text-xs text-slate-500 space-y-2 pt-2 border-t border-slate-200">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Genuine OEM & Aftermarket</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Body Panels & Bumpers</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Direct Rack Stock Delivery</li>
              </ul>
            </div>

            {/* 4. Scrap */}
            <div id="scrap" className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 hover:border-emerald-500 hover:shadow-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Recycle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {t('services.scrap.title')}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {t('services.scrap.desc')}
              </p>
              <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Cash for Accident & Total-Loss Cars</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Qatar Traffic Deregistration Paperwork</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Certified Weightbridge (Tons/Kg)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHY US SECTION */}
      <section id="why-us" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600">
              {t('whyUs.title')}
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Setting High Standards in Qatar’s Automotive Industry
            </p>
            <p className="text-base text-slate-600">
              {t('whyUs.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{t('whyUs.item1Title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t('whyUs.item1Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1875bb] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{t('whyUs.item2Title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t('whyUs.item2Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Paintbrush className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{t('whyUs.item3Title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t('whyUs.item3Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Recycle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{t('whyUs.item4Title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t('whyUs.item4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT / REQUEST SERVICE FORM SECTION */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            {/* Contact Information */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1875bb]">
                  {t('contact.title')}
                </h2>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">
                  Visit Us or Connect Directly
                </p>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  {t('contact.subtitle')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <MapPin className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{t('footer.addressTitle')}</h4>
                    <p className="text-xs text-slate-600">{t('footer.address')}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Near Street 24 Roundabout, Industrial Area</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <Phone className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Direct Phone & WhatsApp</h4>
                    <p className="text-xs text-slate-700 font-semibold">+974 5511 2233 / +974 4400 0000</p>
                    <p className="text-[11px] text-slate-500 mt-1">Available during workshop hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <Clock className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{t('footer.hoursTitle')}</h4>
                    <p className="text-xs text-slate-600">{t('footer.hours')}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Immediate WhatsApp Response</h4>
                  <p className="text-[11px] text-emerald-700">Send photos of car damage or scrap vehicles</p>
                </div>
                <button
                  onClick={handleWhatsAppDirect}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat Now</span>
                </button>
              </div>
            </div>

            {/* Service Request Form */}
            <div className="lg:col-span-7 bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6">
                {t('contact.title')}
              </h3>

              {isSubmitted ? (
                <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-300 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-lg font-bold text-emerald-900">Request Sent Successfully!</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {t('contact.successMsg')}
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={handleWhatsAppDirect}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Continue on WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Submit Another
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t('contact.fullName')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName || ''}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="e.g. Mohammed Al-Kuwari"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t('contact.phone')} *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone || ''}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+974 5511 2233"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t('contact.vehicle')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.vehicle || ''}
                        onChange={e => setFormData({ ...formData, vehicle: e.target.value })}
                        placeholder="e.g. Toyota Land Cruiser 2022"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t('contact.serviceType')} *
                      </label>
                      <select
                        value={formData.serviceType || 'Mechanical'}
                        onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                      >
                        <option value="Mechanical">{t('contact.optMechanical')}</option>
                        <option value="Body & Paint">{t('contact.optBodyPaint')}</option>
                        <option value="Spare Parts">{t('contact.optParts')}</option>
                        <option value="Scrap Trading">{t('contact.optScrap')}</option>
                        <option value="Inspection">{t('contact.optInspection')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t('contact.notes')}
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes || ''}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Please mention any specific repairs, damage descriptions, or parts requested..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1875bb]"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 rounded-xl bg-[#1875bb] hover:bg-[#135d96] text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('contact.submitBtn')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleWhatsAppDirect}
                      className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{t('contact.submitWhatsApp')}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <NajmAlHudaLogo className="h-10 w-auto" />
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('tagline')}
              </p>
              <div className="text-[11px] text-slate-400">
                {t('footer.crInfo')}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">{t('nav.services')}</h4>
              <ul className="text-xs space-y-2">
                <li><a href="#services" className="hover:text-white transition-colors">{t('services.mechanical.title')}</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">{t('services.bodyPaint.title')}</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">{t('services.parts.title')}</a></li>
                <li><a href="#scrap" className="hover:text-white transition-colors">{t('services.scrap.title')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">{t('footer.hoursTitle')}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{t('footer.hours')}</p>
              <p className="text-xs text-slate-400 mt-2 font-mono">Industrial Area, Street 24, Doha, Qatar</p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">System Access</h4>
              <div className="space-y-2">
                <button
                  onClick={() => onNavigate(isAuthenticated ? '/app' : '/login')}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold flex items-center justify-between cursor-pointer"
                >
                  <span>{isAuthenticated ? t('nav.openApp') : t('nav.login')}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} {t('footer.allRights')}
          </div>
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      <div className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-50`}>
        <button
          onClick={handleWhatsAppDirect}
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer animate-bounce"
          title="Chat with Workshop on WhatsApp"
        >
          <MessageSquare className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
