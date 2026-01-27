import { useContext } from 'react';
import { ModalContext } from './ModalProvider';
import { ModalContextValue } from './types';

export function useModal(): ModalContextValue {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }

  return context;
}
