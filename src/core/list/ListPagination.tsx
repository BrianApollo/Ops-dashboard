import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';

interface ListPaginationProps {
  pageIndex: number;
  totalPages: number;
  totalRecords?: number;
  onPageChange: (index: number) => void;
}

export function ListPagination({
  pageIndex,
  totalPages,
  totalRecords,
  onPageChange,
}: ListPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Box
      data-component="list-pagination"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        pt: 2,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontSize: '0.8125rem',
        }}
      >
        Page {pageIndex + 1} of {totalPages}
        {totalRecords !== undefined && ` (${totalRecords} total)`}
      </Typography>

      <Pagination
        count={totalPages}
        page={pageIndex + 1}
        onChange={(_, page) => onPageChange(page - 1)}
        size="small"
        shape="rounded"
        sx={{
          '& .MuiPaginationItem-root': {
            fontSize: '0.8125rem',
            minWidth: 30,
            height: 30,
            borderRadius: 0.75,
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            },
          },
        }}
      />
    </Box>
  );
}
