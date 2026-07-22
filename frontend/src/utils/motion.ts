import type { Transition, Variants } from 'framer-motion';

/* Springs compartilhados */
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 32 };
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 28 };

/* Entrada padrão de seções/cards */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
};

/* Container que escalona a entrada dos filhos (usar com fadeInUp nos filhos) */
export const staggerContainer = (stagger = 0.05, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

/* Transição de rota — exit curto para não atrasar a navegação */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/* Micro-interações padrão */
export const hoverLift = { y: -2 };
export const tapShrink = { scale: 0.97 };
