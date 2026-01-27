import { ReactNode, useState, useCallback, createContext } from 'react';
import { ModalContextValue, ModalState, ModalRegistry } from './types';

export const ModalContext = createContext<ModalContextValue | null>(null);

interface ModalProviderProps {
  children: ReactNode;
  registry: ModalRegistry;
}

export function ModalProvider({ children, registry }: ModalProviderProps) {
  const [modalState, setModalState] = useState<ModalState | null>(null);

  const open = useCallback(<P = unknown>(key: string, payload: P) => {
    setModalState({ key, payload });
  }, []);

  const close = useCallback(() => {
    setModalState(null);
  }, []);

  const contextValue: ModalContextValue = { open, close };

  const activeModal = modalState ? registry[modalState.key] : null;
  const ModalComponent = activeModal?.component;

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {ModalComponent && modalState && (
        <div data-region="modal-portal">
          <ModalComponent payload={modalState.payload} onClose={close} />
        </div>
      )}
    </ModalContext.Provider>
  );
}
