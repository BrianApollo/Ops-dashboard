import { ComponentType } from 'react';

export interface ModalConfig<P = unknown> {
  component: ComponentType<ModalProps<P>>;
}

export interface ModalProps<P = unknown> {
  payload: P;
  onClose: () => void;
}

export interface ModalState<P = unknown> {
  key: string;
  payload: P;
}

export interface ModalContextValue {
  open: <P = unknown>(key: string, payload: P) => void;
  close: () => void;
}

export type ModalRegistry = Record<string, ModalConfig<unknown>>;
