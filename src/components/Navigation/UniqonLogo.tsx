import React from 'react';

interface UniqonLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  titlePart1?: string;
  titlePart2?: string;
  subtitle?: string;
  titlePart1Color?: string;
  titlePart2Color?: string;
  subtitleColor?: string;
}

export const UniqonLogo: React.FC<UniqonLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
  titlePart1 = 'Automotive',
  titlePart2 = 'Workshop',
  subtitle = 'Management System',
  titlePart1Color = 'text-[#1e3a8a]',
  titlePart2Color = 'text-[#dc2626]',
  subtitleColor = 'text-[#0284c7]',
}) => {
  // Dimensions based on size
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const subSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-sm',
    xl: 'text-base',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Authentic Blue Q Icon Box */}
      <div
        className={`${iconSizes[size]} relative rounded-lg bg-gradient-to-b from-[#1875bb] via-[#104e8b] to-[#0b3360] p-0.5 shadow-md flex items-center justify-center shrink-0 border border-[#2b88cc]/50`}
        style={{
          boxShadow: '0 3px 6px rgba(11, 51, 96, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
        }}
      >
        {/* Top glossy sheen reflection */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-lg pointer-events-none" />

        {/* Small "auto" badge on top edge */}
        <div className="absolute -top-1.5 px-1 bg-[#092e54] border border-[#2d7bb5] rounded-full text-[8px] font-sans font-bold text-white tracking-tighter leading-none shadow-xs">
          auto
        </div>

        {/* Stylized 'Q' SVG with eagle wing/swoop cutting through */}
        <svg
          viewBox="0 0 100 100"
          className="w-[82%] h-[82%] drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Q outer curve */}
          <path
            d="M 50 14 C 28 14 15 28 15 50 C 15 72 28 86 50 86 C 60 86 68 82 74 76 L 84 86 L 90 80 L 80 70 C 84 64 87 56 87 50 C 87 28 72 14 50 14 Z M 50 24 C 66 24 76 35 76 50 C 76 57 73 63 68 68 C 66 65 62 61 58 57 C 62 55 64 52 64 48 C 64 40 58 35 50 35 C 42 35 36 40 36 48 C 36 55 41 61 48 62 C 45 66 40 70 34 72 C 29 67 26 59 26 50 C 26 35 35 24 50 24 Z"
            fill="white"
          />
          {/* Dynamic Falcon / Wing flourish swooshing inside Q */}
          <path
            d="M 32 46 C 45 42 60 38 78 30 C 70 38 60 46 48 50 C 58 50 68 47 74 44 C 64 52 52 58 40 60 C 50 60 62 58 68 55 C 55 64 42 67 28 66 C 30 58 31 52 32 46 Z"
            fill="#e5f2ff"
          />
          <path
            d="M 66 72 L 78 84 L 84 78 L 72 66 C 70 68 68 70 66 72 Z"
            fill="#e5941c"
          />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col justify-center leading-tight">
        <div className={`font-sans font-black tracking-tight ${titleSizes[size]} flex items-center`}>
          <span className={`${titlePart1Color} drop-shadow-2xs`}>{titlePart1}</span>
          <span className={`${titlePart2Color} ml-1.5 drop-shadow-2xs`}>{titlePart2}</span>
        </div>
        {showSubtitle && (
          <span
            className={`font-sans font-semibold tracking-wide ${subtitleColor} ${subSizes[size]}`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
