import type { ReactNode } from 'react';
import { InfoIcon } from '@phosphor-icons/react';
import { Tooltip } from './Tooltip';

export function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <Tooltip
      content={<span style={{ display: 'inline-block', whiteSpace: 'normal', maxWidth: 260 }}>{children}</span>}
      placement="right"
    >
      <InfoIcon size={14} weight="bold" style={{ color: 'var(--text-muted)', cursor: 'help' }} />
    </Tooltip>
  );
}
