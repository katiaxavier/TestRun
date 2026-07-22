import { useEffect, useRef } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'framer-motion';

interface CountUpProps {
  value: number;
  duration?: number;
  /* Sufixo colado ao número, ex.: "%" */
  suffix?: string;
}

/* Anima o número de stat cards do valor anterior até o novo. */
export function CountUp({ value, duration = 0.7, suffix = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      mv.set(value);
      if (ref.current) ref.current.textContent = `${value}${suffix}`;
      return;
    }
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: v => {
        if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [value, duration, suffix, mv, reduced]);

  return <span ref={ref}>{`${value}${suffix}`}</span>;
}
