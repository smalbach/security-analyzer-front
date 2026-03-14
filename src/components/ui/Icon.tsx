import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function icon(paths: React.ReactNode) {
  return function IconComponent(props: IconProps) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        width={20}
        height={20}
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const EndpointsIcon = icon(
  <>
    <path d="M3 5h14M3 10h14M3 15h8" />
    <circle cx="16" cy="15" r="2" />
  </>,
);

export const RolesIcon = icon(
  <>
    <circle cx="8" cy="7" r="3" />
    <path d="M2 17c0-3.3 2.7-6 6-6" />
    <path d="M14 13l2 2 4-4" />
  </>,
);

export const TestRunIcon = icon(
  <>
    <path d="M9 3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
    <path d="M9 3l6 5" />
    <path d="M9 3v5h6" />
    <path d="M7 13h6M7 16h4" />
  </>,
);

export const PerformanceIcon = icon(
  <>
    <polyline points="3,17 7,11 11,13 15,7 17,9" />
    <path d="M17 5v4h-4" />
  </>,
);

export const SettingsIcon = icon(
  <>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 2.5v1.2M10 16.3v1.2M2.5 10h1.2M16.3 10h1.2M4.6 4.6l.85.85M14.55 14.55l.85.85M4.6 15.4l.85-.85M14.55 5.45l.85-.85" />
  </>,
);

export const HelpIcon = icon(
  <>
    <circle cx="10" cy="10" r="8" />
    <path d="M7.5 7.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
    <circle cx="10" cy="14.5" r=".6" fill="currentColor" stroke="none" />
  </>,
);

export const ChevronRightIcon = icon(
  <path d="M7.5 5l5 5-5 5" />,
);

export const ArrowLeftIcon = icon(
  <>
    <path d="M15 10H5" />
    <path d="M9 5l-5 5 5 5" />
  </>,
);
