import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { pageTransition } from '../utils/motion';

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}
