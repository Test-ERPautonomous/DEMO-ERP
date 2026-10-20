import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      appName: 'Najm Al Huda Garage & Scrap',
      tagline: 'Automotive Engineering, Collision Repair & Scrap Trading',
      nav: {
        home: 'Home',
        services: 'Services',
        whyUs: 'Why Choose Us',
        scrapTrading: 'Scrap Trading',
        contact: 'Contact Us',
        requestService: 'Request Service',
        login: 'Staff / Client Login',
        openApp: 'Open ERP System',
        dashboard: 'Workshop Dashboard',
        switchLang: 'العربية',
      },
      hero: {
        badge: 'Premier Automotive & Salvage Center • Doha, Qatar',
        title: 'Precision Auto Care, Collision Repair & Certified Scrap Trading',
        description: 'Comprehensive automotive workshop in Industrial Area, Street 24. From computer engine diagnostics and precision paint booths to salvage vehicle purchasing and scrap metal recycling.',
        bookService: 'Request Service / Quote',
        contactWhatsApp: 'Chat on WhatsApp',
        callUs: 'Call Workshop',
        viewServices: 'Explore Services',
        crNotice: 'Licensed Commercial Registration: CR No. 2026/001',
      },
      services: {
        title: 'Our Professional Workshop Services',
        subtitle: 'Specialized mechanical engineering, certified collision body repair, spare parts supply, and commercial scrap vehicle handling.',
        mechanical: {
          title: 'Mechanical & Engine Overhaul',
          desc: 'Comprehensive engine rebuilding, computerized OBD-II diagnostics, transmission overhaul, steering, and suspension balancing for all vehicle makes.',
        },
        bodyPaint: {
          title: 'Body Shop & Oven Paint Booth',
          desc: 'High-precision chassis straightening, paintless dent repair (PDR), computerized color matching, and dust-free heated paint booth baking.',
        },
        parts: {
          title: 'OEM & High-Grade Parts',
          desc: 'Extensive inventory of OEM mechanical spares, body panels, lubricants, suspension arms, and tested replacement assemblies.',
        },
        scrap: {
          title: 'Salvage Cars & Scrap Trading',
          desc: 'Purchasing total-loss accident vehicles, scrap metal weighing, certified vehicle deregulation, and eco-friendly parts salvage.',
        },
      },
      whyUs: {
        title: 'Why Drivers & Fleet Managers Trust Najm Al Huda',
        subtitle: 'Decades of combined automotive engineering experience with transparent Qatar commercial standards.',
        item1Title: 'Licensed Qatar Workshop',
        item1Desc: 'Fully certified workshop operating strictly under State of Qatar Ministry of Commerce regulations.',
        item2Title: 'Master Automotive Engineers',
        item2Desc: 'Specialized technicians in European, American, Japanese, and commercial fleet vehicle mechanics and body alignment.',
        item3Title: 'State-of-the-Art Paint Booth',
        item3Desc: 'Italian heated downdraft paint booth with computerized spectrophotometer color matching ensures factory-fresh finish.',
        item4Title: 'Fair Weighbridge Scrap Valuation',
        item4Desc: 'Transparent valuation for salvage vehicles, scrap iron, aluminum, and brass with instant payment and official police clearance.',
      },
      contact: {
        title: 'Request a Service or Scrap Valuation',
        subtitle: 'Submit your request below or connect directly with our service advisors on WhatsApp for immediate assistance.',
        fullName: 'Your Full Name',
        phone: 'Phone Number (Qatar)',
        vehicle: 'Vehicle Make, Model & Year',
        serviceType: 'Service Needed',
        selectService: 'Select service...',
        optMechanical: 'Mechanical Repair / Periodic Service',
        optBodyPaint: 'Denting, Painting & Collision Repair',
        optParts: 'Spare Parts Inquiry',
        optScrap: 'Sell Scrap / Salvage Vehicle',
        optInspection: 'General Inspection / Estimate',
        notes: 'Describe your requirements or vehicle issues...',
        submitBtn: 'Submit Service Request',
        submitWhatsApp: 'Send Directly via WhatsApp',
        successMsg: 'Thank you! Your request has been recorded. Our service supervisor will contact you shortly.',
      },
      footer: {
        addressTitle: 'Workshop Location',
        address: 'Street 24, Industrial Area, Doha, State of Qatar',
        hoursTitle: 'Working Hours',
        hours: 'Saturday – Thursday: 7:00 AM – 7:00 PM (Friday Closed)',
        crInfo: 'CR No. 2026/001 | State of Qatar',
        allRights: 'All rights reserved. Najm Al Huda Garage & Scrap Trading.',
      },
      auth: {
        loginTitle: 'Workshop ERP Login',
        loginSubtitle: 'Enter your credentials to access the Najm Al Huda Workshop Management System',
        registerTitle: 'Create Staff or Client Account',
        registerSubtitle: 'Register a new account in Najm Al Huda system',
        forgotTitle: 'Reset Password',
        forgotSubtitle: 'Enter your registered email to receive a password reset link',
        resetTitle: 'Set New Password',
        resetSubtitle: 'Create a new secure password for your account',
        email: 'Email Address',
        usernameOrEmail: 'Email or Username',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        fullName: 'Full Name',
        phone: 'Phone Number',
        role: 'Assigned Role',
        rememberMe: 'Remember Me',
        forgotPassword: 'Forgot Password?',
        signIn: 'Sign In',
        signUp: 'Create Account',
        sendResetLink: 'Send Reset Link',
        updatePassword: 'Save New Password',
        backToLogin: 'Back to Sign In',
        backToHome: 'Back to Home',
        noAccount: "Don't have an account?",
        haveAccount: 'Already have an account?',
        demoAccountsTitle: 'Quick Demo Access',
        adminUser: 'Owner / Admin',
        techUser: 'Technician',
      }
    }
  },
  ar: {
    translation: {
      appName: 'كراج نجم الهدى وتجارة السكراب',
      tagline: 'هندسة السيارات، صيانة الحوادث والدهان، وتجارة السكراب',
      nav: {
        home: 'الرئيسية',
        services: 'خدماتنا',
        whyUs: 'لماذا نحن',
        scrapTrading: 'تجارة السكراب',
        contact: 'تواصل معنا',
        requestService: 'طلب خدمة',
        login: 'دخول الموظفين / العملاء',
        openApp: 'فتح نظام الكراج (ERP)',
        dashboard: 'لوحة التحكم',
        switchLang: 'English',
      },
      hero: {
        badge: 'مركز الصيانة المعتمد وتجارة السكراب • الدوحة، قطر',
        title: 'دقة في صيانة السيارات، إصلاح الحوادث، وتجارة السكراب المعتمدة',
        description: 'ورشة متكاملة في المنطقة الصناعية، شارع 24. نوفر أحدث فحص كمبيوتر، أفران دهان حراري متطورة، شراء المركبات المصدومة وتجارة سكراب المعادن.',
        bookService: 'طلب خدمة / تسعيرة فورية',
        contactWhatsApp: 'تواصل عبر الواتساب',
        callUs: 'اتصل بالكراج',
        viewServices: 'استكشف خدماتنا',
        crNotice: 'سجل تجاري معتمد: س.ت 2026/001',
      },
      services: {
        title: 'خدماتنا المتخصصة في الورشة',
        subtitle: 'هندسة ميكانيكية دقيقة، إصلاح حوادث وسمكرة، توريد قطع الغيار، وإدارة سكراب السيارات.',
        mechanical: {
          title: 'الميكانيكا وتوضيب المحركات',
          desc: 'توضيب وصيانة المحركات وناقل الحركة، فحص كمبيوتر دقيق، نظام التعليق والفرامل والمكيفات لكافة أنواع المركبات.',
        },
        bodyPaint: {
          title: 'السمكرة وفرن الدهان الحراري',
          desc: 'سحب وتعديل الشاصيه، تعديل الصدمات بدون دهان (PDR)، مطابقة الألوان بالكمبيوتر، وفرن إيطالي حراري مقاوم للأتربة.',
        },
        parts: {
          title: 'قطع غيار أصلية ومضمونة',
          desc: 'مستودع متكامل للقطع الميكانيكية وهياكل السيارات والمستهلكات والزيوت المعتمدة لجميع الموديلات.',
        },
        scrap: {
          title: 'السيارات المصدومة وتجارة السكراب',
          desc: 'شراء سيارات الحوادث والسكراب، ميزان دقيق، تخليص المرور الرسمي، واستخلاص وتدوير المعادن بأفضل الأسعار.',
        },
      },
      whyUs: {
        title: 'لماذا يختار السائقون والشركات كراج نجم الهدى؟',
        subtitle: 'خبرة طويلة في صيانة المركبات في قطر مع التزام تام بالمعايير الرسمية والجودة العالية.',
        item1Title: 'كراج قطري مرخص ومعتمد',
        item1Desc: 'منشأة معتمدة رسمياً تعمل وفق معايير وزارة التجارة والصناعة بدولة قطر.',
        item2Title: 'مهندسون وفنيون ذوو كفاءة',
        item2Desc: 'طاقم فني متخصص في صيانة السيارات الأوروبية والأمريكية واليابانية وأساطيل الشركات.',
        item3Title: 'فرن دهان حراري متطور',
        item3Desc: 'فرن دهان بنظام فلترة متقدم ومطابقة كمبيوترية للدرجة الأصلية للسيارة مع ضمان الجودة.',
        item4Title: 'تسعير عادل وميزان سكراب دقيق',
        item4Desc: 'تقييم شفاف ومباشر لسيارات الحوادث وسكراب الحديد والألمنيوم والنحاس مع إنهاء إجراءات المرور فوراً.',
      },
      contact: {
        title: 'طلب خدمة أو تسعير سكراب',
        subtitle: 'أرسل بيانات طلبك أدناه أو تواصل مباشرة مع مشرف الاستقبال عبر الواتساب للحصول على استجابة فورية.',
        fullName: 'الاسم الكامل',
        phone: 'رقم الهاتف (قطر)',
        vehicle: 'نوع وموديل وسنة صنع السيارة',
        serviceType: 'نوع الخدمة المطلوبة',
        selectService: 'اختر الخدمة...',
        optMechanical: 'صيانة ميكانيكية / سيرفس دوري',
        optBodyPaint: 'سمكرة ودهان / إصلاح حوادث',
        optParts: 'استفسار عن قطع غيار',
        optScrap: 'بيع سيارة سكراب / معادن',
        optInspection: 'فحص شامل / مقايسة تكاليف',
        notes: 'تفاصيل المشكلة أو مواصفات الطلب...',
        submitBtn: 'إرسال طلب الخدمة',
        submitWhatsApp: 'إرسال مباشرة عبر الواتساب',
        successMsg: 'شكراً لك! تم استلام طلبك بنجاح وسيتواصل معك مشرف الورشة في أقرب وقت.',
      },
      footer: {
        addressTitle: 'موقع الورشة',
        address: 'شارع 24، المنطقة الصناعية، الدوحة، دولة قطر',
        hoursTitle: 'أوقات العمل',
        hours: 'السبت – الخميس: 7:00 صباحاً – 7:00 مساءً (الجمعة مغلق)',
        crInfo: 'سجل تجاري: 2026/001 | دولة قطر',
        allRights: 'جميع الحقوق محفوظة. كراج نجم الهدى وتجارة السكراب.',
      },
      auth: {
        loginTitle: 'تسجيل الدخول لنظام الكراج',
        loginSubtitle: 'أدخل بيانات حسابك للوصول إلى نظام إدارة كراج نجم الهدى',
        registerTitle: 'إنشاء حساب موظف أو عميل',
        registerSubtitle: 'تسجيل حساب جديد في نظام نجم الهدى',
        forgotTitle: 'استعادة كلمة المرور',
        forgotSubtitle: 'أدخل بريدك الإلكتروني المسجل لإرسال رابط إعادة التعيين',
        resetTitle: 'تعيين كلمة مرور جديدة',
        resetSubtitle: 'قم بإنشاء كلمة مرور قوية لحسابك',
        email: 'البريد الإلكتروني',
        usernameOrEmail: 'البريد الإلكتروني أو اسم المستخدم',
        password: 'كلمة المرور',
        confirmPassword: 'تأكيد كلمة المرور',
        fullName: 'الاسم الكامل',
        phone: 'رقم الهاتف',
        role: 'الدور / الصلاحية',
        rememberMe: 'تذكرني',
        forgotPassword: 'نسيت كلمة المرور؟',
        signIn: 'تسجيل الدخول',
        signUp: 'إنشاء الحساب',
        sendResetLink: 'إرسال رابط الاستعادة',
        updatePassword: 'حفظ كلمة المرور الجديدة',
        backToLogin: 'العودة لتسجيل الدخول',
        backToHome: 'العودة للرئيسية',
        noAccount: 'ليس لديك حساب؟',
        haveAccount: 'لديك حساب بالفعل؟',
        demoAccountsTitle: 'تسجيل دخول سريع للتجربة',
        adminUser: 'المالك / المدير',
        techUser: 'فني الصيانة',
      }
    }
  }
};

const savedLang = localStorage.getItem('najm_erp_lang') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Set document direction and language attribute
export const updateDocumentDirection = (lang: string = 'en') => {
  document.documentElement.dir = 'ltr';
  document.documentElement.lang = 'en';
};

// Initialize direction on load
updateDocumentDirection('en');

export default i18n;
