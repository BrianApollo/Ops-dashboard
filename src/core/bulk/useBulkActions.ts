import { useState, useCallback } from 'react';

interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean | ((items: T[]) => boolean);
  hidden?: boolean | ((items: T[]) => boolean);
  onExecute: (items: T[]) => Promise<void> | void;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

interface UseBulkActionsOptions<T> {
  actions: BulkAction<T>[];
  onComplete?: (actionId: string, items: T[]) => void;
  onError?: (actionId: string, error: Error) => void;
}

interface UseBulkActionsResult<T> {
  isExecuting: boolean;
  executingActionId: string | null;
  executeAction: (actionId: string, items: T[]) => Promise<void>;
  getVisibleActions: (items: T[]) => BulkAction<T>[];
  isActionDisabled: (action: BulkAction<T>, items: T[]) => boolean;
}

export function useBulkActions<T>({
  actions,
  onComplete,
  onError,
}: UseBulkActionsOptions<T>): UseBulkActionsResult<T> {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const isActionDisabled = useCallback(
    (action: BulkAction<T>, items: T[]): boolean => {
      if (typeof action.disabled === 'function') {
        return action.disabled(items);
      }
      return action.disabled ?? false;
    },
    []
  );

  const isActionHidden = useCallback(
    (action: BulkAction<T>, items: T[]): boolean => {
      if (typeof action.hidden === 'function') {
        return action.hidden(items);
      }
      return action.hidden ?? false;
    },
    []
  );

  const getVisibleActions = useCallback(
    (items: T[]): BulkAction<T>[] => {
      return actions.filter((action) => !isActionHidden(action, items));
    },
    [actions, isActionHidden]
  );

  const executeAction = useCallback(
    async (actionId: string, items: T[]): Promise<void> => {
      const action = actions.find((a) => a.id === actionId);
      if (!action) {
        console.error(`Bulk action with id "${actionId}" not found`);
        return;
      }

      if (isActionDisabled(action, items)) {
        console.warn(`Bulk action "${actionId}" is disabled`);
        return;
      }

      setIsExecuting(true);
      setExecutingActionId(actionId);

      try {
        await action.onExecute(items);
        onComplete?.(actionId, items);
      } catch (error) {
        console.error(`Bulk action "${actionId}" failed:`, error);
        onError?.(actionId, error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsExecuting(false);
        setExecutingActionId(null);
      }
    },
    [actions, isActionDisabled, onComplete, onError]
  );

  return {
    isExecuting,
    executingActionId,
    executeAction,
    getVisibleActions,
    isActionDisabled,
  };
}

export type { BulkAction };
