import React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

const NewChatIcon: React.FC<IconProps> = ({ className, style, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 25.012 25.01"
    className={className}
    style={style}
    {...props}
  >
    <g
      fill="none"
      stroke={style?.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
      data-name="Group 6308"
    >
      <path
        d="M22.084 1.261a1.75 1.75 0 0 0-2.474 0l-2.142 2.143h0l-9.085 9.085a.4.4 0 0 0-.1.164l-1.427 5.03a.38.38 0 0 0 .365.483.4.4 0 0 0 .1-.014l5.031-1.427a.4.4 0 0 0 .165-.1L23.749 5.402a1.75 1.75 0 0 0 0-2.474ZM8.366 12.643l4.069 4.071m9.525-9.352-4.242-4.244"
        data-name="Path 3195"
      />
      <path
        d="M10.106 5.551H1.751a1.006 1.006 0 0 0-1 1v16.7a1.006 1.006 0 0 0 1 1h16.7a1.006 1.006 0 0 0 1.005-1v-8.35"
        data-name="Path 3196"
      />
    </g>
  </svg>
);

export default NewChatIcon;
