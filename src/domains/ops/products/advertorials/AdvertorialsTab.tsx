import { useState } from 'react';
import Box from '@mui/material/Box';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { EmptyState } from '../../../../core/state';
import { ListPagination } from '../../../../core/list';
import { tableHeaderCellSx, tableDataCellSx } from '../composition/styles';
import { Advertorial, AdvertorialFilters } from '../../../../features/advertorials';
import { UseListControllerResult } from '../../../../core/list/useListController';
import { AdvertorialDetailsModal } from './AdvertorialDetailsModal';
import { UpdateAdvertorialDialog } from './UpdateAdvertorialDialog';

interface AdvertorialsTabProps {
    controller: UseListControllerResult<Advertorial, AdvertorialFilters>;
    onApprove: (id: string) => Promise<void>;
    onUpdate: (id: string, fields: Partial<Advertorial>) => Promise<void>;
}

export function AdvertorialsTab({ controller, onApprove, onUpdate }: AdvertorialsTabProps) {
    const { visibleRecords, pageIndex, totalPages, filteredCount, setPageIndex } = controller;
    const [selectedAdvertorial, setSelectedAdvertorial] = useState<Advertorial | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [advertorialToUpdate, setAdvertorialToUpdate] = useState<Advertorial | null>(null);

    const handleOpenDetails = (adv: Advertorial) => {
        setSelectedAdvertorial(adv);
        setDetailsOpen(true);
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setSelectedAdvertorial(null);
    };

    const handleOpenUpdate = (adv: Advertorial) => {
        setAdvertorialToUpdate(adv);
        setUpdateDialogOpen(true);
    };

    const handleCloseUpdate = () => {
        setUpdateDialogOpen(false);
        setAdvertorialToUpdate(null);
    };

    if (visibleRecords.length === 0) {
        return (
            <Box>
                <EmptyState
                    title="No Advertorials Found"
                    message="There are no advertorials matching your criteria."
                />
                <UpdateAdvertorialDialog
                    open={updateDialogOpen}
                    onClose={handleCloseUpdate}
                    onSubmit={onUpdate}
                    isSubmitting={controller.isLoading}
                    advertorial={advertorialToUpdate}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                            <TableCell sx={tableHeaderCellSx}>Advertorial Name</TableCell>
                            <TableCell sx={tableHeaderCellSx}>Product</TableCell>
                            <TableCell sx={tableHeaderCellSx}>Advertorial Text</TableCell>
                            <TableCell sx={tableHeaderCellSx}>Final Advertorial Link</TableCell>
                            <TableCell sx={{ ...tableHeaderCellSx, width: 100, textAlign: 'center' }}>Approved</TableCell>
                            <TableCell sx={{ ...tableHeaderCellSx, width: 150, textAlign: 'center' }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visibleRecords.map((adv) => (
                            <TableRow
                                key={adv.id}
                                hover
                                sx={{
                                    '&:last-child td': { borderBottom: 0 },
                                }}
                            >
                                <TableCell sx={tableDataCellSx}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {adv.name}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={tableDataCellSx}>
                                    <Typography variant="body2" color="text.secondary">
                                        {adv.productName}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={tableDataCellSx}>
                                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                                        {adv.text || '-'}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={tableDataCellSx}>
                                    {adv.link ? (
                                        <Link href={adv.link} target="_blank" rel="noopener" underline="hover" sx={{ fontSize: '0.875rem' }}>
                                            {adv.link}
                                        </Link>
                                    ) : (
                                        <Typography variant="body2" color="text.disabled">-</Typography>
                                    )}
                                </TableCell>
                                <TableCell sx={{ ...tableDataCellSx, textAlign: 'center' }}>
                                    {adv.isChecked ? (
                                        <CheckCircleIcon color="success" fontSize="small" />
                                    ) : (
                                        <CancelIcon color="disabled" fontSize="small" />
                                    )}
                                </TableCell>
                                <TableCell sx={{ ...tableDataCellSx, textAlign: 'center' }}>
                                    {!adv.isChecked ? (
                                        <>
                                            <Tooltip title="Approve">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onApprove(adv.id)}
                                                    color="primary"
                                                    sx={{ mr: 1, border: '1px solid', borderColor: 'divider' }}
                                                >
                                                    <CheckCircleIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Update">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenUpdate(adv)}
                                                    color="info"
                                                    sx={{ border: '1px solid', borderColor: 'divider' }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    ) : (
                                        <Tooltip title="Approved">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    disabled
                                                    sx={{ mr: 1, border: '1px solid', borderColor: 'divider' }}
                                                    color="success"
                                                >
                                                    <CheckCircleIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="View Details">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleOpenDetails(adv)}
                                            sx={{ ml: 1, border: '1px solid', borderColor: 'divider' }}
                                        >
                                            <VisibilityIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <ListPagination
                pageIndex={pageIndex}
                totalPages={totalPages}
                totalRecords={filteredCount}
                onPageChange={setPageIndex}
            />

            <AdvertorialDetailsModal
                open={detailsOpen}
                onClose={handleCloseDetails}
                advertorial={selectedAdvertorial}
            />

            <UpdateAdvertorialDialog
                open={updateDialogOpen}
                onClose={handleCloseUpdate}
                onSubmit={onUpdate}
                isSubmitting={controller.isLoading}
                advertorial={advertorialToUpdate}
            />
        </Box>
    );
}
