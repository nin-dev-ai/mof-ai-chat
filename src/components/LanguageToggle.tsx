import React from 'react';
import { twMerge } from 'tailwind-merge';

interface LanguageToggleProps {
  isArabic: boolean;
  onChange: (isArabic: boolean) => void;
  className?: string;
  themeColors?: { primary: string };
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  isArabic,
  onChange,
  className,
  themeColors = { primary: '#C6A75D' },
}) => {
  return (
    <div
      className={twMerge(
        'inline-flex items-center rounded-full border border-[#EAECF0] bg-white p-0.5 shadow-sm',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => onChange(false)}
        className={twMerge(
          'px-3 py-1.5 text-xs font-semibold rounded-full transition-colors',
          !isArabic ? 'text-white' : 'text-[#667085] hover:text-[#344054]',
        )}
        style={!isArabic ? { backgroundColor: themeColors.primary } : undefined}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={twMerge(
          'px-3 py-1.5 text-xs font-semibold rounded-full transition-colors',
          isArabic ? 'text-white' : 'text-[#667085] hover:text-[#344054]',
        )}
        style={isArabic ? { backgroundColor: themeColors.primary } : undefined}
      >
        AR
      </button>
    </div>
  );
};
