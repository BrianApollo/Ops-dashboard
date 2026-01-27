/**
 * FilterPills - Reusable pill-based filter toggle component.
 *
 * Used for binary filter states like:
 * - Assigned / Unassigned (Scripts)
 * - Available / Used (Images)
 *
 * Features:
 * - Toggle behavior: click active pill to clear filter
 * - Visual feedback: opacity + outline for active state
 * - Consistent styling across all usages
 */

import Box from '@mui/material/Box';
import { StatusPill } from '../../ui';
import type { StatusKey } from '../../constants/status';

export interface FilterPillOption<T extends string> {
  /** Filter value (e.g., 'assigned', 'available') */
  value: T;
  /** Status key for pill color */
  status: StatusKey;
  /** Display label (e.g., '5 Assigned') */
  label: string;
}

interface FilterPillsProps<T extends string> {
  /** Available filter options */
  options: FilterPillOption<T>[];
  /** Currently active filter (null = no filter) */
  activeFilter: T | null;
  /** Called when filter changes */
  onFilterChange: (filter: T | null) => void;
}

export function FilterPills<T extends string>({
  options,
  activeFilter,
  onFilterChange,
}: FilterPillsProps<T>) {
  const handleClick = (value: T) => {
    // Toggle: clicking active filter clears it
    onFilterChange(activeFilter === value ? null : value);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {options.map((option) => {
        const isActive = activeFilter === option.value;
        const isOtherActive = activeFilter !== null && activeFilter !== option.value;

        return (
          <StatusPill
            key={option.value}
            status={option.status}
            label={option.label}
            onClick={() => handleClick(option.value)}
            sx={{
              cursor: 'pointer',
              opacity: isOtherActive ? 0.5 : 1,
              outline: isActive ? '2px solid' : 'none',
              outlineColor: 'primary.main',
            }}
          />
        );
      })}
    </Box>
  );
}
