import React from "react";

type AvatarAiIconProps = React.SVGProps<SVGSVGElement> & {
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  transform?: string;
};

const AvatarAiIcon: React.FC<AvatarAiIconProps> = ({
  className,
  style = {},
  color = "currentColor",
  strokeColor = "none",
  strokeWidth = 0,
  transform = "scale(1.2)",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 27 27"
      className={className}
      style={{ transform, ...style }}
      {...props}
    >
      <circle
        cx="13.5"
        cy="13.5"
        r="13"
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      <g>
        <path
          fill="#fff"
          d="m15.246 6.5.847 2.591a1.12 1.12 0 0 0 .747.747l2.591.847-2.591.847a1.12 1.12 0 0 0-.747.747l-.847 2.591-.847-2.59a1.12 1.12 0 0 0-.747-.747l-2.591-.848 2.591-.847a1.12 1.12 0 0 0 .747-.747Z"
        />
        <path
          fill="#fff"
          d="m9.267 13.088.678 2.034a.83.83 0 0 0 .555.555l2.034.678-2.034.678a.83.83 0 0 0-.555.555l-.678 2.034-.678-2.034a.83.83 0 0 0-.555-.555l-2.034-.678 2.034-.678a.83.83 0 0 0 .555-.555Z"
        />
      </g>
    </svg>
  );
};

export default AvatarAiIcon;
