import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

interface ActiveProjectInfo {
  id: string;
  name: string;
}

interface ActiveProjectContextValue {
  activeProject: ActiveProjectInfo | null;
  setActiveProject: Dispatch<SetStateAction<ActiveProjectInfo | null>>;
}

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProject] = useState<ActiveProjectInfo | null>(null);
  return (
    <ActiveProjectContext.Provider value={{ activeProject, setActiveProject }}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject(): ActiveProjectContextValue {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) throw new Error('useActiveProject must be used inside ActiveProjectProvider');
  return ctx;
}
