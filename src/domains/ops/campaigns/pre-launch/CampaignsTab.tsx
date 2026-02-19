/**
 * CampaignsTab - Campaigns table view.
 * Table with: Name | Status | Actions
 * Status filter pills for Preparing / Launched.
 * Navigation uses campaignId only - never depends on product filter state.
 */

import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { useListController, FilterPills, ListPagination } from '../../../../core/list';
import { EmptyState } from '../../../../core/state';
import { StatusPill } from '../../../../ui';
import { tableHeaderCellSx, tableDataCellSx } from '../../products/composition/styles';
import { matchesAllTokens } from '../../../../utils';
import type { CampaignItem } from '../../products/composition/types';

type StatusFilter = 'Preparing' | 'Launched' | 'Cancelled';

interface CampaignFilters {
  status: StatusFilter | null;
}

interface CampaignsTabProps {
  campaigns: CampaignItem[];
}

export function CampaignsTab({ campaigns }: CampaignsTabProps) {
  const navigate = useNavigate();

  // Status filtering and search using useListController
  const list = useListController<CampaignItem, CampaignFilters>({
    records: campaigns,
    initialFilters: { status: 'Launched' },
    initialPageSize: 20,
    filterFn: (records, filters) => {
      if (!filters.status) return records;
      return records.filter((c) => c.status === filters.status);
    },
    searchFn: (records, searchTerm) => {
      if (!searchTerm.trim()) return records;
      return records.filter((c) => matchesAllTokens(searchTerm, c.name));
    },
  });

  // Counts from all records (unfiltered)
  const preparingCount = list.allRecords.filter((c) => c.status === 'Preparing').length;
  const launchedCount = list.allRecords.filter((c) => c.status === 'Launched').length;
  const cancelledCount = list.allRecords.filter((c) => c.status === 'Cancelled').length;

  // Navigate using productId and campaignId
  const handleView = (productId: string, campaignId: string) => {
    navigate(`/ops/products/${productId}/campaigns/${campaignId}`);
  };

  const handleLaunch = (productId: string, campaignId: string) => {
    navigate(`/ops/products/${productId}/campaigns/${campaignId}/launch`);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filter Pills + Search */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FilterPills<StatusFilter>
          options={[
            { value: 'Preparing', status: 'preparing', label: `${preparingCount} Preparing` },
            { value: 'Launched', status: 'launched', label: `${launchedCount} Launched` },
            { value: 'Cancelled', status: 'cancelled', label: `${cancelledCount} Cancelled` },
          ]}
          activeFilter={list.filters.status}
          onFilterChange={(filter) => list.setFilters({ status: filter })}
        />
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search campaigns..."
          value={list.searchTerm}
          onChange={(e) => list.setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: 400,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'grey.100',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'grey.300' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      </Box>

      {list.filteredRecords.length === 0 ? (
        <EmptyState variant="filter" />
      ) : (
        <>
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
                  <TableCell sx={tableHeaderCellSx}>Campaign</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Status</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, width: 100 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.visibleRecords.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    hover
                    sx={{
                      '&:last-child td': { borderBottom: 0 },
                    }}
                  >
                    <TableCell sx={tableDataCellSx}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {campaign.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={tableDataCellSx}>
                      <StatusPill status={campaign.status} />
                    </TableCell>
                    <TableCell sx={tableDataCellSx}>
                      {campaign.status === 'Preparing' ? (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLaunch(campaign.productId, campaign.id);
                          }}
                          sx={{ borderRadius: 5, px: 2, minWidth: 0, textTransform: 'none', fontSize: '0.8125rem' }}
                        >
                          Launch
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(campaign.productId, campaign.id);
                          }}
                          sx={{ borderRadius: 5, px: 2, minWidth: 0, textTransform: 'none', fontSize: '0.8125rem' }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <ListPagination
            pageIndex={list.pageIndex}
            totalPages={list.totalPages}
            totalRecords={list.filteredCount}
            onPageChange={list.setPageIndex}
          />
        </>
      )}
    </Box>
  );
}
