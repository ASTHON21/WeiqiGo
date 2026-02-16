
'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SearchTreeVisualizationProps {
  isThinking: boolean;
}

const nodeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      delay: i * 0.05 + 0.2,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        delay: i * 0.05,
        duration: 0.5,
        ease: 'easeInOut',
      },
    }),
  };

// Pre-defined structure for the stylized tree
const nodes = [
  { cx: 50, cy: 10, r: 4, i: 1 }, // root
  { cx: 25, cy: 30, r: 3, i: 2 },
  { cx: 75, cy: 30, r: 3, i: 3 },
  { cx: 15, cy: 50, r: 2.5, i: 4 },
  { cx: 35, cy: 50, r: 2.5, i: 5 },
  { cx: 65, cy: 50, r: 2.5, i: 6 },
  { cx: 85, cy: 50, r: 2.5, i: 7 },
  { cx: 10, cy: 70, r: 2, i: 8 },
  { cx: 20, cy: 70, r: 2, i: 9 },
  { cx: 30, cy: 70, r: 2, i: 10 },
  { cx: 40, cy: 70, r: 2, i: 11 },
  { cx: 60, cy: 70, r: 2, i: 12 },
  { cx: 70, cy: 70, r: 2, i: 13 },
  { cx: 80, cy: 70, r: 2, i: 14 },
  { cx: 90, cy: 70, r: 2, i: 15 },
];

const paths = [
    { d: "M 50 10 L 25 30", i: 1 },
    { d: "M 50 10 L 75 30", i: 1.5 },
    { d: "M 25 30 L 15 50", i: 2 },
    { d: "M 25 30 L 35 50", i: 2.5 },
    { d: "M 75 30 L 65 50", i: 3 },
    { d: "M 75 30 L 85 50", i: 3.5 },
    { d: "M 15 50 L 10 70", i: 4 },
    { d: "M 15 50 L 20 70", i: 4.5 },
    { d: "M 35 50 L 30 70", i: 5 },
    { d: "M 35 50 L 40 70", i: 5.5 },
    { d: "M 65 50 L 60 70", i: 6 },
    { d: "M 65 50 L 70 70", i: 6.5 },
    { d: "M 85 50 L 80 70", i: 7 },
    { d: "M 85 50 L 90 70", i: 7.5 },
];

export function SearchTreeVisualization({ isThinking }: SearchTreeVisualizationProps) {
  return (
    <AnimatePresence>
      {isThinking && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="w-full max-w-xl overflow-hidden"
        >
          <div className="p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-black/10 text-center">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">AI Search Analysis</h3>
            <motion.svg viewBox="0 0 100 85" className="w-full h-auto max-h-48">
              {paths.map((path, index) => (
                <motion.path
                  key={`path-${index}`}
                  d={path.d}
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  variants={pathVariants}
                  initial="hidden"
                  animate="visible"
                  custom={path.i}
                />
              ))}
              {nodes.map((node, index) => (
                <motion.circle
                  key={`node-${index}`}
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r}
                  fill="hsl(var(--foreground))"
                  stroke="hsl(var(--background))"
                  strokeWidth="0.5"
                  variants={nodeVariants}
                  initial="hidden"
                  animate="visible"
                  custom={node.i}
                />
              ))}
            </motion.svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
