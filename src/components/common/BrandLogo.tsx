import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact' | 'icon';
  customLogoUrl?: string;
  customName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  customLogoUrl,
  customName,
}) => {
  // If user provided a custom uploaded logo image, render it
  if (customLogoUrl && customLogoUrl.trim() !== '') {
    const sizeClasses = {
      sm: 'h-8 max-w-[120px]',
      md: 'h-12 max-w-[160px]',
      lg: 'h-20 max-w-[240px]',
      xl: 'h-32 max-w-[320px]',
    };

    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <img
          src={customLogoUrl}
          alt={customName || 'Restaurant Logo'}
          className={`${sizeClasses[size]} object-contain`}
        />
        {variant !== 'icon' && customName && (
          <span className="font-bold text-lg text-[#241611] tracking-wide">
            {customName}
          </span>
        )}
      </div>
    );
  }

  // Official Logo of "مشويات الباشا - EL BASHA GRILL"
  // Crafted faithfully to the official uploaded identity
  if (variant === 'icon') {
    const iconSizes = {
      sm: 'w-7 h-7',
      md: 'w-10 h-10',
      lg: 'w-14 h-14',
      xl: 'w-20 h-20',
    };

    return (
      <svg
        viewBox="0 0 100 115"
        className={`${iconSizes[size]} ${className} drop-shadow-sm`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Red Arch */}
        <path
          d="M50 4 C50 4, 38 14, 35 24 C30 26, 24 30, 24 40 L24 95 L34 95 L34 48 C34 40, 40 32, 50 25 C60 32, 66 40, 66 48 L66 95 L76 95 L76 40 C76 30, 70 26, 65 24 C62 14, 50 4, 50 4 Z"
          fill="#8B1E1E"
          stroke="#681212"
          strokeWidth="1.5"
        />
        {/* Kilim / Carpet Left Panel */}
        <rect x="26" y="44" width="7" height="48" fill="#3F532B" rx="1" />
        <polygon points="29.5,48 32,53 29.5,58 27,53" fill="#D7C3A5" />
        <polygon points="29.5,63 32,68 29.5,73 27,68" fill="#8B1E1E" />
        <polygon points="29.5,78 32,83 29.5,88 27,83" fill="#B8860B" />
        
        {/* Kilim / Carpet Right Panel */}
        <rect x="67" y="44" width="7" height="48" fill="#3F532B" rx="1" />
        <polygon points="70.5,48 73,53 70.5,58 68,53" fill="#D7C3A5" />
        <polygon points="70.5,63 73,68 70.5,73 68,68" fill="#8B1E1E" />
        <polygon points="70.5,78 73,83 70.5,88 68,83" fill="#B8860B" />

        {/* Central Flame */}
        <path
          d="M50 18 C52 24, 58 28, 55 35 C53 38, 48 37, 49 42 C44 38, 44 32, 47 28 C48 24, 49 20, 50 18 Z"
          fill="url(#iconFlameGrad)"
        />
        {/* Grill Skewer Meat Pieces */}
        <rect x="49" y="40" width="2" height="50" fill="#3F532B" />
        <path d="M43 45 C43 42, 57 42, 57 45 C57 48, 43 48, 43 45 Z" fill="#D2B48C" stroke="#A67C52" strokeWidth="0.8" />
        <path d="M42 51 C42 48, 58 48, 58 51 C58 54, 42 54, 42 51 Z" fill="#CDB087" stroke="#A67C52" strokeWidth="0.8" />
        <path d="M43 57 C43 54, 57 54, 57 57 C57 60, 43 60, 43 57 Z" fill="#D2B48C" stroke="#A67C52" strokeWidth="0.8" />
        <path d="M42 63 C42 60, 58 60, 58 63 C58 66, 42 66, 42 63 Z" fill="#CDB087" stroke="#A67C52" strokeWidth="0.8" />
        <path d="M43 69 C43 66, 57 66, 57 69 C57 72, 43 72, 43 69 Z" fill="#D2B48C" stroke="#A67C52" strokeWidth="0.8" />
        
        {/* Bottom Diamond Crest */}
        <polygon points="50,86 56,92 50,98 44,92" fill="#8B1E1E" stroke="#B8860B" strokeWidth="1" />
        <polygon points="50,89 53,92 50,95 47,92" fill="#B8860B" />

        <defs>
          <linearGradient id="iconFlameGrad" x1="50" y1="18" x2="50" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF3D00" />
            <stop offset="0.6" stopColor="#E64A19" />
            <stop offset="1" stopColor="#B71C1C" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        {/* Emblem */}
        <svg viewBox="0 0 100 115" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M50 4 C50 4, 38 14, 35 24 C30 26, 24 30, 24 40 L24 95 L34 95 L34 48 C34 40, 40 32, 50 25 C60 32, 66 40, 66 48 L66 95 L76 95 L76 40 C76 30, 70 26, 65 24 C62 14, 50 4, 50 4 Z"
            fill="#8B1E1E"
            stroke="#681212"
            strokeWidth="1.5"
          />
          <rect x="26" y="44" width="7" height="48" fill="#3F532B" rx="1" />
          <polygon points="29.5,48 32,53 29.5,58 27,53" fill="#D7C3A5" />
          <polygon points="29.5,63 32,68 29.5,73 27,68" fill="#8B1E1E" />
          <rect x="67" y="44" width="7" height="48" fill="#3F532B" rx="1" />
          <polygon points="70.5,48 73,53 70.5,58 68,53" fill="#D7C3A5" />
          <polygon points="70.5,63 73,68 70.5,73 68,68" fill="#8B1E1E" />
          
          <path d="M50 18 C52 24, 58 28, 55 35 C53 38, 48 37, 49 42 C44 38, 44 32, 47 28 C48 24, 49 20, 50 18 Z" fill="#E64A19" />
          <rect x="49" y="40" width="2" height="50" fill="#3F532B" />
          <path d="M43 45 C43 42, 57 42, 57 45 C57 48, 43 48, 43 45 Z" fill="#D2B48C" />
          <path d="M42 51 C42 48, 58 48, 58 51 C58 54, 42 54, 42 51 Z" fill="#CDB087" />
          <path d="M43 57 C43 54, 57 54, 57 57 C57 60, 43 60, 43 57 Z" fill="#D2B48C" />
          <polygon points="50,86 56,92 50,98 44,92" fill="#8B1E1E" stroke="#B8860B" strokeWidth="1" />
        </svg>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg leading-tight tracking-tight text-[#1E140F]">
              {customName || 'مشويات الباشا'}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-[#8B1E1E] tracking-widest uppercase">
            EL BASHA GRILL
          </span>
        </div>
      </div>
    );
  }

  // Full High-Definition Official Logo representation
  const containerDimensions = {
    sm: 'w-24',
    md: 'w-36',
    lg: 'w-48',
    xl: 'w-64',
  };

  return (
    <div className={`flex flex-col items-center select-none text-center ${containerDimensions[size]} ${className}`}>
      <svg
        viewBox="0 0 300 330"
        className="w-full h-auto drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bashaFlame" x1="150" y1="35" x2="150" y2="105" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF3D00" />
            <stop offset="0.4" stopColor="#E64A19" />
            <stop offset="0.8" stopColor="#D32F2F" />
            <stop offset="1" stopColor="#8B1E1E" />
          </linearGradient>

          <linearGradient id="archBevel" x1="70" y1="15" x2="230" y2="180" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A32424" />
            <stop offset="0.5" stopColor="#8B1E1E" />
            <stop offset="1" stopColor="#5E1111" />
          </linearGradient>

          <linearGradient id="goldBevel" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#D4AF37" />
            <stop offset="0.5" stopColor="#B8860B" />
            <stop offset="1" stopColor="#7E5806" />
          </linearGradient>

          <filter id="subtleDrop" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* --- Top Arch Gate (Crimson & Relief) --- */}
        <g filter="url(#subtleDrop)">
          {/* Outer Arch Trim */}
          <path
            d="M150 12 C150 12, 118 36, 110 58 C96 62, 80 72, 80 96 L80 178 L104 178 L104 116 C104 98, 120 78, 150 62 C180 78, 196 98, 196 116 L196 178 L220 178 L220 96 C220 72, 204 62, 190 58 C182 36, 150 12, 150 12 Z"
            fill="url(#archBevel)"
            stroke="#4A0E0E"
            strokeWidth="2"
          />

          {/* Left Kilim Rug Panel */}
          <g>
            <rect x="85" y="94" width="16" height="82" fill="#364C23" rx="2" />
            <rect x="87" y="96" width="12" height="78" fill="#8B1E1E" />
            {/* Diamond motifs */}
            <polygon points="93,102 98,109 93,116 88,109" fill="#FFF8EF" />
            <polygon points="93,105 96,109 93,113 90,109" fill="#B8860B" />

            <polygon points="93,122 98,129 93,136 88,129" fill="#364C23" />
            <polygon points="93,125 96,129 93,133 90,129" fill="#D7C3A5" />

            <polygon points="93,142 98,149 93,156 88,149" fill="#FFF8EF" />
            <polygon points="93,145 96,149 93,153 90,149" fill="#8B1E1E" />

            <polygon points="93,162 98,168 93,174 88,168" fill="#B8860B" />
          </g>

          {/* Right Kilim Rug Panel */}
          <g>
            <rect x="199" y="94" width="16" height="82" fill="#364C23" rx="2" />
            <rect x="201" y="96" width="12" height="78" fill="#8B1E1E" />
            {/* Diamond motifs */}
            <polygon points="207,102 212,109 207,116 202,109" fill="#FFF8EF" />
            <polygon points="207,105 210,109 207,113 204,109" fill="#B8860B" />

            <polygon points="207,122 212,129 207,136 202,129" fill="#364C23" />
            <polygon points="207,125 210,129 207,133 204,129" fill="#D7C3A5" />

            <polygon points="207,142 212,149 207,156 202,149" fill="#FFF8EF" />
            <polygon points="207,145 210,149 207,153 204,149" fill="#8B1E1E" />

            <polygon points="207,162 212,168 207,174 202,168" fill="#B8860B" />
          </g>

          {/* Center Flame & Skewer */}
          {/* Flame */}
          <path
            d="M150 28 C155 42, 172 52, 164 68 C160 74, 148 72, 150 82 C136 74, 134 62, 142 54 C146 46, 148 38, 150 28 Z"
            fill="url(#bashaFlame)"
          />
          {/* Skewer Rod */}
          <rect x="148" y="78" width="4" height="86" fill="#364C23" rx="1" />

          {/* Grilled Cuts Stack */}
          <g filter="url(#subtleDrop)">
            <ellipse cx="150" cy="92" rx="15" ry="5.5" fill="#E2C799" stroke="#9E6728" strokeWidth="1" />
            <ellipse cx="150" cy="104" rx="16" ry="6" fill="#DDBF8D" stroke="#9E6728" strokeWidth="1" />
            <ellipse cx="150" cy="116" rx="15.5" ry="5.5" fill="#E2C799" stroke="#9E6728" strokeWidth="1" />
            <ellipse cx="150" cy="128" rx="16" ry="6" fill="#DDBF8D" stroke="#9E6728" strokeWidth="1" />
            <ellipse cx="150" cy="140" rx="15" ry="5.5" fill="#E2C799" stroke="#9E6728" strokeWidth="1" />
          </g>

          {/* Bottom Arch Diamond Node */}
          <polygon points="150,165 163,178 150,191 137,178" fill="#8B1E1E" stroke="#5E1111" strokeWidth="1.5" />
          <polygon points="150,169 159,178 150,187 141,178" fill="url(#goldBevel)" />
          <polygon points="150,173 155,178 150,183 145,178" fill="#8B1E1E" />
        </g>

        {/* --- Main 3D Calligraphy: الباشا --- */}
        <g filter="url(#subtleDrop)">
          {/* Shadow layer */}
          <text
            x="150"
            y="245"
            textAnchor="middle"
            fill="#140D0A"
            fontSize="74"
            fontWeight="900"
            fontFamily="'Cairo', 'Amiri', 'Traditional Arabic', serif"
            letterSpacing="-1"
          >
            {customName || 'الباشا'}
          </text>
          
          {/* Golden Diamond Dots for Arabic Calligraphy */}
          <polygon points="108,186 116,194 108,202 100,194" fill="url(#goldBevel)" stroke="#5E3F0A" strokeWidth="0.8" />
          <polygon points="122,176 130,184 122,192 114,184" fill="url(#goldBevel)" stroke="#5E3F0A" strokeWidth="0.8" />
          <polygon points="172,254 180,262 172,270 164,262" fill="url(#goldBevel)" stroke="#5E3F0A" strokeWidth="0.8" />
        </g>

        {/* --- Sub-Heading: مشويات الباشا --- */}
        <g>
          {/* Left Flanking Diamond Spear */}
          <polygon points="68,272 50,274 44,272 50,270" fill="#8B1E1E" />
          <polygon points="70,272 75,276 70,280 65,276" fill="#8B1E1E" />
          <polygon points="70,273 73,276 70,279 67,276" fill="url(#goldBevel)" />

          {/* Subtext in Olive Grill Green */}
          <text
            x="150"
            y="278"
            textAnchor="middle"
            fill="#364C23"
            fontSize="21"
            fontWeight="800"
            fontFamily="'Cairo', sans-serif"
          >
            مشويات الباشا
          </text>

          {/* Right Flanking Diamond Spear */}
          <polygon points="230,272 225,276 230,280 235,276" fill="#8B1E1E" />
          <polygon points="230,273 227,276 230,279 233,276" fill="url(#goldBevel)" />
          <polygon points="232,272 250,274 256,272 250,270" fill="#8B1E1E" />
        </g>

        {/* --- English Text: EL BASHA GRILL --- */}
        <text
          x="150"
          y="300"
          textAnchor="middle"
          fill="#A67C52"
          fontSize="13.5"
          fontWeight="700"
          fontFamily="'Cinzel', 'Trajan Pro', 'Cairo', serif"
          letterSpacing="4"
        >
          EL BASHA GRILL
        </text>

        {/* --- Bottom Ornate Spear Ornament --- */}
        <g>
          <line x1="90" y1="316" x2="135" y2="316" stroke="#8B1E1E" strokeWidth="1.5" />
          <line x1="165" y1="316" x2="210" y2="316" stroke="#8B1E1E" strokeWidth="1.5" />
          
          <polygon points="144,316 148,319 144,322 140,319" fill="#8B1E1E" />
          <polygon points="150,312 155,316 150,320 145,316" fill="url(#goldBevel)" stroke="#7E5806" strokeWidth="0.8" />
          <polygon points="156,316 160,319 156,322 152,319" fill="#8B1E1E" />

          <polygon points="85,316 92,314 92,318" fill="#8B1E1E" />
          <polygon points="215,316 208,314 208,318" fill="#8B1E1E" />
        </g>
      </svg>
    </div>
  );
};
