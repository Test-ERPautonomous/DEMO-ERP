import React, { useRef } from 'react';
import { Camera, Wrench } from 'lucide-react';
import { useGarage } from '../../context/GarageContext';

interface HeaderLogoBadgeProps {
  currentLogoUrl?: string;
  onLogoChange?: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const HeaderLogoBadge: React.FC<HeaderLogoBadgeProps> = ({
  currentLogoUrl,
  onLogoChange,
  size = 'md',
  showText = true,
  className = ''
}) => {
  const { settings, updateSettings } = useGarage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const logoUrl = currentLogoUrl || (settings as any)?.headerLogoUrl || (settings as any)?.logoUrl;
  const garageName = settings?.garageName || 'Najm Al Huda';
  const garageNameAr = (settings as any)?.garageNameAr || 'نجم الهدى';

  const sizeDimensions = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-16 h-16 text-xl'
  }[size];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        if (onLogoChange) {
          onLogoChange(base64Url);
        } else {
          updateSettings({ ...settings, headerLogoUrl: base64Url } as any);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBadgeClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        className="hidden"
      />
      <div
        onClick={handleBadgeClick}
        title="Click to change logo photo"
        className={`relative group ${sizeDimensions} rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 p-0.5 shadow-md flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-105 overflow-hidden shrink-0`}
      >
        <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={garageName} className="w-full h-full object-cover" />
          ) : (
            <Wrench className="w-1/2 h-1/2 text-amber-400" />
          )}
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[10px]">
          <Camera className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight select-none">
          <span className="font-black tracking-tight text-slate-900 text-xs sm:text-sm uppercase">
            {garageName}
          </span>
          <span className="text-[10px] font-semibold text-amber-600 font-arabic">
            {garageNameAr}
          </span>
        </div>
      )}
    </div>
  );
};
