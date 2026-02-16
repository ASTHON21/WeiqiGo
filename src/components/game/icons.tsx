import type { SVGProps } from 'react';

const Stone = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="50" cy="50" r="48" />
  </svg>
);

export const Icons = {
  Stone,
};
