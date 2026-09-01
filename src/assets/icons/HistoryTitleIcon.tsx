import React from "react";

type RefreshIconProps = React.SVGProps<SVGSVGElement> & {
  className?: string;
  style?: React.CSSProperties;
};

const HistoryTitleIcon: React.FC<RefreshIconProps> = ({ className, style, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 56 56"
    className={className}
    style={style}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <g
      fill="none"
      stroke={style?.stroke || "#000"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props?.strokeWidth}
    >
      <path d="M27.998 50.062c-12.185.506-22.472-8.961-22.978-21.146S13.981 6.444 26.166 5.938s22.472 8.961 22.978 21.146a22.08 22.08 0 0 1-5.625 15.661" />
      <path d="m41.774 34.099.484 9.065 8.743.161M28.394 39.239V25.387h-10.04" />
    </g>
  </svg>
);

export default HistoryTitleIcon;
