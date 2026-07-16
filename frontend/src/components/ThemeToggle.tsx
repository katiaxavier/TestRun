import { AnimatePresence, motion } from 'framer-motion';
import { MoonStarsIcon, SunIcon } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';
import { Tooltip } from './Tooltip';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Tooltip content={isDark ? 'Tema claro' : 'Tema escuro'} placement="bottom" delay={300}>
      <motion.button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        whileTap={{ scale: 0.9 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex' }}
          >
            {isDark ? <SunIcon size={17} weight="duotone" /> : <MoonStarsIcon size={17} weight="duotone" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </Tooltip>
  );
}
