import React from 'react';

interface NajmAlHudaLogoProps {
  className?: string;
  variant?: 'on-light' | 'on-dark';
  subtitle?: string;
  iconOnly?: boolean;
}

export const NajmAlHudaLogo: React.FC<NajmAlHudaLogoProps> = ({
  className = '',
  subtitle,
  iconOnly = false,
}) => {
  if (iconOnly) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <img
          src="/logo-icon.svg"
          alt="Najm Al Huda Icon"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`invoice-logo-div flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-[340px] mx-auto py-1 ${className}`}>
      <div className="w-full relative flex items-center justify-center">
        <img
          src="/logo.svg"
          alt="NAJM AL HUDA GARAGE & SCRAP"
          referrerPolicy="no-referrer"
          className="w-full h-auto max-h-20 sm:max-h-24 object-contain filter drop-shadow-xs print:drop-shadow-none"
        />
      </div>
      {subtitle && (
        <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mt-1 text-center">
          {subtitle}
        </span>
      )}
    </div>
  );
};
