import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface ReadOnlyContextValue {
  isReadOnly: boolean;
  setReadOnly: (value: boolean) => void;
  toggleReadOnly: () => void;
  reason?: string;
  setReason: (reason: string | undefined) => void;
}

const ReadOnlyContext = createContext<ReadOnlyContextValue | null>(null);

interface ReadOnlyProviderProps {
  children: ReactNode;
  initialReadOnly?: boolean;
  initialReason?: string;
}

export function ReadOnlyProvider({
  children,
  initialReadOnly = false,
  initialReason,
}: ReadOnlyProviderProps) {
  const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);
  const [reason, setReason] = useState<string | undefined>(initialReason);

  const setReadOnly = useCallback((value: boolean) => {
    setIsReadOnly(value);
  }, []);

  const toggleReadOnly = useCallback(() => {
    setIsReadOnly((prev) => !prev);
  }, []);

  const value = useMemo(
    (): ReadOnlyContextValue => ({
      isReadOnly,
      setReadOnly,
      toggleReadOnly,
      reason,
      setReason,
    }),
    [isReadOnly, setReadOnly, toggleReadOnly, reason]
  );

  return (
    <ReadOnlyContext.Provider value={value}>
      {children}
    </ReadOnlyContext.Provider>
  );
}

export function useReadOnly(): ReadOnlyContextValue {
  const context = useContext(ReadOnlyContext);
  if (!context) {
    // Return a default non-readonly state if no provider is found
    // This allows components to work without requiring a provider
    return {
      isReadOnly: false,
      setReadOnly: () => {},
      toggleReadOnly: () => {},
      reason: undefined,
      setReason: () => {},
    };
  }
  return context;
}

// Hook for checking if currently in read-only mode
export function useIsReadOnly(): boolean {
  const { isReadOnly } = useReadOnly();
  return isReadOnly;
}
