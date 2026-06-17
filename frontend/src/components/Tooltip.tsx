import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  display?: React.CSSProperties['display'];
  children: React.ReactElement;
}

interface Pos { x: number; y: number }

const GAP = 6;
const VIEWPORT_MARGIN = 8;

function computePos(rect: DOMRect, placement: TooltipPlacement): Pos {
  switch (placement) {
    case 'top':    return { x: rect.left + rect.width / 2, y: rect.top - GAP };
    case 'bottom': return { x: rect.left + rect.width / 2, y: rect.bottom + GAP };
    case 'left':   return { x: rect.left - GAP, y: rect.top + rect.height / 2 };
    case 'right':  return { x: rect.right + GAP, y: rect.top + rect.height / 2 };
  }
}

const transformMap: Record<TooltipPlacement, string> = {
  top:    'translate(-50%, -100%)',
  bottom: 'translate(-50%, 0%)',
  left:   'translate(-100%, -50%)',
  right:  'translate(0%, -50%)',
};

const motionInitial: Record<TooltipPlacement, object> = {
  top:    { opacity: 0, y: 4 },
  bottom: { opacity: 0, y: -4 },
  left:   { opacity: 0, x: 4 },
  right:  { opacity: 0, x: -4 },
};

export function Tooltip({ content, placement = 'top', delay = 400, display = 'inline-flex', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [xAdjust, setXAdjust] = useState(0);
  const [ready, setReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const balloonRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    if (wrapperRef.current) {
      setPos(computePos(wrapperRef.current.getBoundingClientRect(), placement));
      setXAdjust(0);
      setReady(false);
    }
  }, [placement]);

  const show = () => {
    updatePos();
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // After the balloon renders (hidden), measure it and clamp to viewport before showing.
  useLayoutEffect(() => {
    if (!visible) { setReady(false); return; }
    if (!balloonRef.current) return;
    const r = balloonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    let dx = 0;
    if (r.right > vw - VIEWPORT_MARGIN) dx = vw - VIEWPORT_MARGIN - r.right;
    else if (r.left < VIEWPORT_MARGIN) dx = VIEWPORT_MARGIN - r.left;
    setXAdjust(dx);
    setReady(true);
  }, [visible, pos]);

  if (!content) return children;

  return (
    <span
      ref={wrapperRef}
      style={{ position: 'relative', display }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              ref={balloonRef}
              role="tooltip"
              initial={motionInitial[placement]}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: 'fixed',
                top: pos.y,
                left: pos.x + xAdjust,
                transform: transformMap[placement],
                zIndex: 9999,
                pointerEvents: 'none',
                // Hide until measured to prevent position flash
                visibility: ready ? 'visible' : 'hidden',
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
                  whiteSpace: 'nowrap',
                }}
              >
                {content}
              </span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  );
}
