import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';

export interface SidebarSelectOption {
  id: string;
  label: string;
}

interface SidebarSelectProps {
  label: string;
  options: SidebarSelectOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SidebarSelect({ label, options, selectedId, onSelect }: SidebarSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.id === selectedId) ?? null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="sidebar-select" ref={ref}>
      <label className="sidebar-select-label">{label}</label>
      <button
        type="button"
        className="sidebar-select-trigger"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="sidebar-select-value">{selected?.label}</span>
        <CaretDownIcon size={12} weight="bold" className="sidebar-select-caret" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="sidebar-select-panel"
          >
            {options.map(option => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={option.id === selectedId}
                className={`sidebar-select-option${option.id === selectedId ? ' active' : ''}`}
                onClick={() => { onSelect(option.id); setOpen(false); }}
              >
                <span className="sidebar-select-option-label">{option.label}</span>
                {option.id === selectedId && <CheckIcon size={14} weight="bold" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
