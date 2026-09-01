import React from "react";

type CustomIconProps = React.SVGProps<SVGSVGElement> & {
  className?: string;
  style?: React.CSSProperties;
};

const SpeakerIcon: React.FC<CustomIconProps> = ({ className, style, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 56 56"
    className={className}
    style={style}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <path
      fill={style?.fill}
      stroke={style?.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M45.162 13.905c7.784 7.785 7.784 20.405 0 28.19"
    />
    <path
      fill={style?.fill}
      stroke={style?.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M36.325 5.138 19.811 16.609a12.27 12.27 0 0 1-6.996 2.19H8.068A3.07 3.07 0 0 0 5 21.867v12.265A3.064 3.064 0 0 0 8.061 37.2h4.75c2.501 0 4.942.764 6.996 2.19l16.518 11.471a1.534 1.534 0 0 0 2.409-1.259V6.401a1.534 1.534 0 0 0-2.409-1.262Z"
    />
  </svg>
);

export default SpeakerIcon;
