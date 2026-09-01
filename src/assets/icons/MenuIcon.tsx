import React from "react";

type HamburgerIconProps = React.SVGProps<SVGSVGElement> & {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
};

const MenuIcon: React.FC<HamburgerIconProps> = ({
  className,
  style,
  width = 24,
  height = 24,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    preserveAspectRatio="xMidYMid meet"
    width={width}
    height={height}
    {...props}
  >
    <rect x="3" y="4" width="18" height="3" rx="0.5" fill="none" />
    <rect x="3" y="10.5" width="18" height="3" rx="0.5" fill="none" />
    <rect x="3" y="17" width="18" height="3" rx="0.5" fill="none" />
  </svg>
);

export default MenuIcon;
