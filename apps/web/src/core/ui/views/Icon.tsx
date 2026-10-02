import type { SVGProps } from 'react';

/**
 * Íconos de trazo propios (24×24, trazo 1.75). Sin dependencias externas para que funcionen offline.
 * Son decorativos por defecto (aria-hidden); si un ícono es el único contenido, pase `label`.
 */
const PATHS = {
  home: 'M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z',
  products: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5m0 0 8-4.5M12 12v9',
  costs: 'M4 19V9m5.33 10V5m5.34 14v-7M20 19v-4M3 21h18',
  ai: 'M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7-5.6-1.9L10.1 9zM18.5 3v3m1.5-1.5h-3M5 17.5v3m1.5-1.5h-3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  ingredients:
    'M7 21h10M12 21v-6m0 0c-3.87 0-7-3.13-7-7V4h0c3.87 0 7 3.13 7 7m0 4c3.87 0 7-3.13 7-7V4h0c-3.87 0-7 3.13-7 7',
  purchases: 'M5 4h2l2.2 10.5a1 1 0 0 0 1 .8h7.6a1 1 0 0 0 1-.76L20.5 8H7.5M10 20h.01M17 20h.01',
  suppliers:
    'M3 17V7a1 1 0 0 1 1-1h10v11M14 10h4l3 3.5V17h-7M7.5 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4m10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  scenarios: 'M4 20 9.5 11l4 5L20 6M20 6h-4.5M20 6v4.5',
  reports: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1m7 0v5h5M9.5 13h6m-6 4h6',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.4a7.6 7.6 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 0 1 0-3L4.4 9.3l2-3.4 1.9.7a7.6 7.6 0 0 1 2.1-1.2L10.7 3h4l.3 2.4a7.6 7.6 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 0 1 0 3',
  pulse: 'M3 12h4l2.5-6 5 12 2.5-6H21',
  grid: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
  chevronRight: 'm9 5 7 7-7 7',
  chevronLeft: 'm15 5-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  alert:
    'M12 8v5m0 3.5h.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
  info: 'M12 11v6m0-9.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  offline:
    'M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.5m5.6 0A10 10 0 0 1 19 12.9M2 9.4a15 15 0 0 1 4.4-2.9M12 20h.01',
  refresh: 'M20 11a8 8 0 0 0-14.3-4.9L4 8m0-5v5h5m-5 5a8 8 0 0 0 14.3 4.9L20 16m0 5v-5h-5',
  plus: 'M12 5v14M5 12h14',
  chevronDown: 'm5 9 7 7 7-7',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14m9 2-4-4',
  edit: 'M4 20h4L19 9l-4-4L4 16zm9-13 4 4',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M8 8h11v12H8zM5 16V4h11',
  download: 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14',
  upload: 'M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 20h14',
  archive: 'M3 4h18v4H3zm2 4v12h14V8m-9 4h4',
  restore: 'M4 12a8 8 0 1 0 2.3-5.6L4 8.5M4 4v4.5h4.5',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4m-4 4h11',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-7 8a7 7 0 0 1 14 0',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 20a6 6 0 0 1 12 0m1-9a3 3 0 1 0 0-6m2 15h3a5 5 0 0 0-4-5',
  camera:
    'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1m8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7',
  send: 'M4 12 20 4l-5 16-3-7zm8 1 8-9',
  eye: 'M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7m9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  file: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1m7 0v5h5',
  calendar: 'M4 6h16v14H4zm0 4h16M8 3v4m8-4v4',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  building: 'M4 21V4h11v17M15 9h5v12M8 8h3m-3 4h3m-3 4h3M2 21h20',
  lock: 'M6 11h12v10H6zm2 0V8a4 4 0 0 1 8 0v3',
  mail: 'M3 6h18v12H3zm0 0 9 7 9-7',
  trendUp: 'M3 17l6-6 4 4 8-8m0 0h-5m5 0v5',
  trendDown: 'M3 7l6 6 4-4 8 8m0 0h-5m5 0v-5',
  shield: 'M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z',
  history: 'M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 4v4.5H8',
  menu: 'M4 7h16M4 12h16M4 17h16',
  arrowRight: 'M5 12h14m-5-5 5 5-5 5',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName;
  size?: number;
  /** Texto accesible si el ícono comunica algo por sí solo. */
  label?: string;
}

export function Icon({ name, size = 22, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
