import { Play, Undo2, Flag, AppWindow, type LucideProps } from 'lucide-react';
import type { SVGProps } from 'react';

const Stone = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="50" cy="50" r="48" />
  </svg>
);

const Logo = (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" fill="currentColor"/>
    </svg>
);


export const Icons = {
  Stone,
  Play: (props: LucideProps) => <Play {...props} />,
  Undo: (props: LucideProps) => <Undo2 {...props} />,
  Resign: (props: LucideProps) => <Flag {...props} />,
  Logo: Logo,
};
