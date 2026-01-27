import { ReactNode } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import TableSortLabel from '@mui/material/TableSortLabel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  tableHeaderCellSx,
  tableDataCellSx,
  tableRowClickableSx,
  tableRowSelectedSx,
} from '../../domains/ops/products/composition/styles';

type BaseRecord = { id: string };

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface ListController<T extends BaseRecord> {
  visibleRecords: T[];
  sort: SortConfig | null;
  hasSelection: boolean;
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  handleSort: (field: string) => void;
}

interface Column<T extends BaseRecord> {
  field: string;
  header: string;
  render: (record: T) => ReactNode;
  sortable?: boolean;
  width?: number | string;
}

interface ListTableViewProps<T extends BaseRecord> {
  list: ListController<T>;
  columns: Column<T>[];
  renderRowActions?: (record: T) => ReactNode;
  onRowClick?: (record: T) => void;
}

export function ListTableView<T extends BaseRecord>({
  list,
  columns,
  renderRowActions,
  onRowClick,
}: ListTableViewProps<T>) {
  const allSelected = list.visibleRecords.length > 0 && list.visibleRecords.every(r => list.isSelected(r.id));
  const someSelected = list.hasSelection && !allSelected;

  if (list.visibleRecords.length === 0) {
    return (
      <Box
        sx={{
          py: 6,
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No records found
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell
              padding="checkbox"
              sx={{ ...tableHeaderCellSx, width: 48, py: 1 }}
            >
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={() => (list.hasSelection ? list.clearSelection() : list.selectAll())}
              />
            </TableCell>
            {columns.map((column) => (
              <TableCell
                key={column.field}
                sx={{ ...tableHeaderCellSx, whiteSpace: 'nowrap', width: column.width }}
              >
                {column.sortable !== false ? (
                  <TableSortLabel
                    active={list.sort?.field === column.field}
                    direction={list.sort?.field === column.field ? list.sort.direction : 'asc'}
                    onClick={() => list.handleSort(column.field)}
                  >
                    {column.header}
                  </TableSortLabel>
                ) : (
                  column.header
                )}
              </TableCell>
            ))}
            {renderRowActions && (
              <TableCell
                align="right"
                sx={{ ...tableHeaderCellSx, width: 100 }}
              >
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {list.visibleRecords.map((record) => (
            <TableRow
              key={record.id}
              hover
              selected={list.isSelected(record.id)}
              sx={{
                ...tableRowClickableSx,
                ...tableRowSelectedSx,
                cursor: onRowClick ? 'pointer' : 'default',
              }}
              onClick={() => onRowClick?.(record)}
            >
              <TableCell
                padding="checkbox"
                onClick={(e) => e.stopPropagation()}
                sx={{ py: 1.5 }}
              >
                <Checkbox
                  size="small"
                  checked={list.isSelected(record.id)}
                  onChange={() => list.toggleSelection(record.id)}
                />
              </TableCell>
              {columns.map((column) => (
                <TableCell
                  key={column.field}
                  sx={tableDataCellSx}
                >
                  {column.render(record)}
                </TableCell>
              ))}
              {renderRowActions && (
                <TableCell
                  align="right"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ py: 1, px: 2 }}
                >
                  {renderRowActions(record)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
