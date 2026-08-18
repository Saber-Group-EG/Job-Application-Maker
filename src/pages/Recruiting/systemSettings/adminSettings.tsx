// pages/AdminUsagePage.tsx
import { useMemo, useState } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { LinearProgress, Box, Chip, Avatar, Typography } from '@mui/material';
import {
  useCompaniesUsageOverview,
} from '../../../hooks/queries/useSystemSettings';
import CompanyUsageDetailDrawer from '../../../components/settings/CompanyUsageDetailDrawer';
import { CompanyUsageRow } from '../../../types/SystemSettings';

const usageColor = (ratio: number) =>
  ratio >= 1 ? 'error' : ratio >= 0.9 ? 'warning' : 'success';

const UsageBar = ({ used, limit }: { used: number; limit: number }) => {
  const ratio = limit > 0 ? used / limit : 0;
  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography variant="caption">
        {used.toLocaleString()} / {limit.toLocaleString()}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min(ratio * 100, 100)}
        color={usageColor(ratio)}
        sx={{ height: 6, borderRadius: 1 }}
      />
    </Box>
  );
};

const STATUS_COLOR: Record<
  string,
  'success' | 'warning' | 'error' | 'default'
> = {
  active: 'success',
  past_due: 'warning',
  suspended: 'error',
  expired: 'error',
  cancelled: 'default',
};

export default function AdminUsagePage() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );

  const { data, isLoading, isFetching } = useCompaniesUsageOverview({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
  });
  const columns = useMemo<MRT_ColumnDef<CompanyUsageRow>[]>(
    () => [
      {
        accessorKey: 'companyName',
        header: 'Company',
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={row.original.companyLogo ?? undefined}
              sx={{ width: 28, height: 28 }}
            />
            <Typography variant="body2">{row.original.companyName.en}</Typography>
          </Box>
        ),
      },
      { accessorKey: 'planName', header: 'Plan' },
      {
        accessorKey: 'subscriptionStatus',
        header: 'Status',
        Cell: ({ cell }) => (
          <Chip
            size="small"
            label={cell.getValue<string>()}
            color={STATUS_COLOR[cell.getValue<string>()] ?? 'default'}
          />
        ),
      },
      {
        accessorKey: 'requestQuota',
        header: 'Request Quota',
        Cell: ({ cell }) => {
          const v = cell.getValue<CompanyUsageRow['requestQuota']>();
          return <UsageBar used={v.used} limit={v.limit} />;
        },
      },
      {
        accessorKey: 'aiCredits',
        header: 'AI Credits ($)',
        Cell: ({ cell }) => {
          const v = cell.getValue<CompanyUsageRow['aiCredits']>();
          return <UsageBar used={v.used} limit={v.limit} />;
        },
      },
      {
        accessorKey: 'aiEnabled',
        header: 'AI Enabled',
        Cell: ({ cell }) => (
          <Chip
            size="small"
            label={cell.getValue<boolean>() ? 'Enabled' : 'Disabled'}
            color={cell.getValue<boolean>() ? 'success' : 'default'}
          />
        ),
      },
    ],
    []
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Company Subscriptions & AI Usage
      </Typography>
      <MaterialReactTable
        columns={columns}
        data={data?.data ?? []}
        manualPagination
        onPaginationChange={setPagination}
        state={{ pagination, isLoading, showProgressBars: isFetching }}
        rowCount={
          undefined /* wire up total count once the backend returns one */
        }
        enableGlobalFilter
        onGlobalFilterChange={setSearch}
        muiTableBodyRowProps={({ row }) => ({
          onClick: () => setSelectedCompanyId(row.original.companyId),
          sx: { cursor: 'pointer' },
        })}
      />
      <CompanyUsageDetailDrawer
        companyId={selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
      />
    </Box>
  );
}
