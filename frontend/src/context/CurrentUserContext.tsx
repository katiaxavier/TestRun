import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../api/client';

const CurrentUserContext = createContext<AuthUser | undefined>(undefined);

export function CurrentUserProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser deve ser usado dentro de um CurrentUserProvider.');
  return ctx;
}
