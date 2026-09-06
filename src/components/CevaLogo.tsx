import React from 'react';

interface CevaLogoProps {
  className?: string;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CevaLogo: React.FC<CevaLogoProps> = ({
  className = '',
  variant = 'dark',
  size = 'md',
}) => {
  // Height map for different size presets
  const heightClass = {
    sm: 'h-6',
    md: 'h-9 sm:h-10',
    lg: 'h-12 sm:h-14',
    xl: 'h-16 sm:h-20',
  }[size];

  // Navy blue color for dark variant (on light backgrounds), White for light variant (on dark backgrounds)
  const textColor = variant === 'light' ? '#FFFFFF' : '#0B1C38';
  const redColor = '#E30613'; // Official CEVA corporate red

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg
        viewBox="0 0 460 150"
        className={`${heightClass} w-auto object-contain overflow-visible`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="CEVA Logistics"
      >
        {/* Letter 'c' */}
        <path
          d="M75 35 C38 35 15 55 15 90 C15 125 38 145 75 145 C95 145 110 137 120 126 L108 108 C100 116 90 122 75 122 C53 122 39 109 39 90 C39 71 53 58 75 58 C90 58 100 64 108 72 L120 54 C110 43 95 35 75 35 Z"
          fill={textColor}
        />

        {/* Letter 'e' */}
        <path
          d="M190 85 C190 55 168 35 138 35 C108 35 86 58 86 90 C86 122 108 145 138 145 C158 145 174 137 184 125 L168 110 C160 118 150 122 138 122 C122 122 110 112 108 97 L190 97 C190 93 190 89 190 85 Z M110 80 C113 67 124 58 138 58 C152 58 163 67 166 80 L110 80 Z"
          fill={textColor}
        />

        {/* Letter 'v' */}
        <path
          d="M178 38 L206 142 L234 142 L262 38 L238 38 L220 114 L202 38 L178 38 Z"
          fill={textColor}
        />

        {/* The iconic stylized CEVA 'a' red sail triangle */}
        <g>
          {/* Main Red Triangle / Sail */}
          <path
            d="M265 142 L315 28 C318 22 324 22 327 28 L378 142 C381 148 377 154 370 154 L273 154 C266 154 262 148 265 142 Z"
            fill={redColor}
          />
          {/* Internal negative space curve creating the distinctive white ribbon of the CEVA sail */}
          <path
            d="M318 42 L332 142 C333 147 329 152 324 152 L290 152 C285 152 282 147 284 142 C295 110 307 75 318 42 Z"
            fill={variant === 'light' ? '#213145' : '#FFFFFF'}
          />
        </g>

        {/* LOGISTICS subtitle with wide geometric tracking */}
        <text
          x="195"
          y="180"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="36"
          fontWeight="900"
          letterSpacing="0.32em"
          fill={textColor}
        >
          LOGISTICS
        </text>
      </svg>
    </div>
  );
};
