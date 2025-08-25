import React from 'react';

type CourtAddIconProps = {
  size?: number;
  color?: string;
  isDisabled?: boolean;
};

const CourtAddIcon: React.FC<CourtAddIconProps> = ({ 
  size = 24, 
  color = '#6B7280', // Gray color to match other icons
  isDisabled = false 
}) => {
  const iconColor = isDisabled ? '#B0B0B0' : color;
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      {/* Simple parallelogram court shape */}
      <path
        d="M4 18 L8 6 L20 6 L16 18 Z"
        fill="none"
        stroke={iconColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      
      {/* Center line (net) */}
      <line
        x1="6"
        y1="12"
        x2="18"
        y2="12"
        stroke={iconColor}
        strokeWidth="1.5"
        strokeDasharray="2,2"
      />
      
      {/* Plus icon in top-right */}
      <circle
        cx="18"
        cy="8"
        r="3"
        fill={iconColor}
        stroke="white"
        strokeWidth="1"
      />
      <line
        x1="16.5"
        y1="8"
        x2="19.5"
        y2="8"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="6.5"
        x2="18"
        y2="9.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default CourtAddIcon;