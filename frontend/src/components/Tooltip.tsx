import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  display?: React.CSSProperties['display'];
  children: React.ReactElement;
}

const ARROW_SIZE = 6;

const placementStyles: Record<TooltipPlacement, React.CSSProperties> = {
  top:    { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: ARROW_SIZE + 4 },
  bottom: { top: '100%',   left: '50%', transform: 'translateX(-50%)', marginTop: ARROW_SIZE + 4 },
  left:   { right: '100%', top: '50%',  transform: 'translateY(-50%)', marginRight: ARROW_SIZE + 4 },
  right:  { left: '100%',  top: '50%',  transform: 'translateY(-50%)', marginLeft: ARROW_SIZE + 4 },
};

const arrowStyles: Record<TooltipPlacement, React.CSSProperties> = {
  top: {
    bottom: -ARROW_SIZE,
    left: '50%',
    transform: 'translateX(-50%)',
    borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px 0`,
    borderColor: 'var(--bg-overlay) transparent transparent',
  },
  bottom: {
    top: -ARROW_SIZE,
    left: '50%',
    transform: 'translateX(-50%)',
    borderWidth: `0 ${ARROW_SIZE}px ${ARROW_SIZE}px`,
    borderColor: 'transparent transparent var(--bg-overlay)',
  },
  left: {
    right: -ARROW_SIZE,
    top: '50%',
    transform: 'translateY(-50%)',
    borderWidth: `${ARROW_SIZE}px 0 ${ARROW_SIZE}px ${ARROW_SIZE}px`,
    borderColor: 'transparent transparent transparent var(--bg-overlay)',
  },
  right: {
    left: -ARROW_SIZE,
    top: '50%',
    transform: 'translateY(-50%)',
    borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px 0`,
    borderColor: 'transparent var(--bg-overlay) transparent transparent',
  },
};

const motionVariants: Record<TooltipPlacement, { initial: object; animate: object }> = {
  top:    { initial: { opacity: 0, y: 4 },  animate: { opacity: 1, y: 0 } },
  bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } },
  left:   { initial: { opacity: 0, x: 4 },  animate: { opacity: 1, x: 0 } },
  right:  { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } },
};

export function Tooltip({ content, placement = 'top', delay = 400, display = 'inline-flex', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!content) return children;

  const { initial, animate } = motionVariants[placement];

  return (
    <span
      style={{ position: 'relative', display }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            role="tooltip"
            initial={initial}
            animate={animate}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              zIndex: 9999,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              ...placementStyles[placement],
            }}
          >
            <span
              style={{
                display: 'block',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-md)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                fontWeight: 500,
                lineHeight: 1.4,
                padding: '0.35rem 0.65rem',
                letterSpacing: '0.01em',
              }}
            >
              {content}
            </span>
            <span
              style={{
                position: 'absolute',
                width: 0,
                height: 0,
                borderStyle: 'solid',
                ...arrowStyles[placement],
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
