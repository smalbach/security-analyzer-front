import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface HelpContextValue {
  isOpen: boolean;
  activeSection: string;
  openHelp: (section?: string) => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('getting-started');

  const openHelp = useCallback((section?: string) => {
    if (section) setActiveSection(section);
    setIsOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <HelpContext.Provider value={{ isOpen, activeSection, openHelp, closeHelp }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp(): HelpContextValue {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error('useHelp must be used inside HelpProvider');
  return ctx;
}
