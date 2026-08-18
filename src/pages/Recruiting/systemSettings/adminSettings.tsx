import { useMemo, useState } from 'react';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Localization,
} from 'material-react-table';
import {
  Avatar,
  Box,
  Chip,
  LinearProgress,
  ThemeProvider,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material';
import {
  useCompaniesUsageOverview,
} from '../../../hooks/queries/useSystemSettings';
import CompanyUsageDetailDrawer from '../../../components/settings/CompanyUsageDetailDrawer';
import PageBreadcrumb from '../../../components/common/PageBreadCrumb';
import PageMeta from '../../../components/common/PageMeta';
import { useLocale } from '../../../context/LocaleContext';
import { useTheme as useAppTheme } from '../../../context/ThemeContext';
import type { CompanyUsageRow } from '../../../types/SystemSettings';

const usageColor = (ratio: number) =>
  ratio >= 1 ? 'error' : ratio >= 0.9 ? 'warning' : 'success';

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

const STATUS_LABEL_KEY: Record<string, string> = {
  active: 'statusActive',
  past_due: 'statusPastDue',
  suspended: 'statusSuspended',
  expired: 'statusExpired',
  cancelled: 'statusCancelled',
};

const UsageBar = ({ used, limit }: { used: number; limit: number }) => {
  const { t, dir } = useLocale();
  const ratio = limit > 0 ? used / limit : 0;
  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography variant="caption">
        {used.toLocaleString(dir === 'rtl' ? 'ar-EG' : 'en-US')} /{' '}
        {limit.toLocaleString(dir === 'rtl' ? 'ar-EG' : 'en-US')}
      </Typography>
      <Tooltip
        title={t('usagePercent', 'systemSettings', {
          percent: Math.round(Math.min(ratio, 1) * 100),
        })}
      >
        <LinearProgress
          variant="determinate"
          value={Math.min(ratio * 100, 100)}
          color={usageColor(ratio)}
          sx={{ height: 6, borderRadius: '999px' }}
        />
      </Tooltip>
    </Box>
  );
};

export default function AdminUsagePage() {
  const { t, locale, dir } = useLocale();
  const { theme: appTheme } = useAppTheme();
  const isDark = appTheme === 'dark';
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

  const muiTheme = useMemo(
    () =>
      createTheme({
        direction: dir,
        palette: { mode: isDark ? 'dark' : 'light' },
        typography: { fontFamily: "'Outfit', 'Cairo', sans-serif" },
        components: {
          MuiLinearProgress: {
            styleOverrides: {
              root: ({ theme }) => ({
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(148,163,184,0.15)'
                    : '#E2E8F0',
              }),
              bar: { borderRadius: '999px' },
            },
          },
        },
      }),
    [dir, isDark]
  );

  const columns = useMemo<MRT_ColumnDef<CompanyUsageRow>[]>(
    () => [
      {
        accessorKey: 'companyName',
        header: t('colCompany', 'systemSettings'),
        Cell: ({ row }) => {
          const name = row.original.companyName;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                src={row.original.companyLogo ?? undefined}
                sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}
              >
                {name.en.charAt(0)}
              </Avatar>
              <Typography variant="body2">
                {locale === 'ar' ? name.ar || name.en : name.en || name.ar}
              </Typography>
            </Box>
          );
        },
      },
      { accessorKey: 'planName', header: t('colPlan', 'systemSettings') },
      {
        accessorKey: 'subscriptionStatus',
        header: t('colStatus', 'systemSettings'),
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const labelKey = STATUS_LABEL_KEY[status];
          return (
            <Chip
              size="small"
              label={labelKey ? t(labelKey, 'systemSettings') : status}
              color={STATUS_COLOR[status] ?? 'default'}
            />
          );
        },
      },
      {
        accessorKey: 'requestQuota',
        header: t('colRequestQuota', 'systemSettings'),
        Cell: ({ cell }) => {
          const v = cell.getValue<CompanyUsageRow['requestQuota']>();
          return <UsageBar used={v.used} limit={v.limit} />;
        },
      },
      {
        accessorKey: 'aiCredits',
        header: t('colAiCredits', 'systemSettings'),
        Cell: ({ cell }) => {
          const v = cell.getValue<CompanyUsageRow['aiCredits']>();
          return <UsageBar used={v.used} limit={v.limit} />;
        },
      },
      {
        accessorKey: 'aiEnabled',
        header: t('colAiEnabled', 'systemSettings'),
        Cell: ({ cell }) => (
          <Chip
            size="small"
            label={
              cell.getValue<boolean>()
                ? t('aiEnabled', 'systemSettings')
                : t('aiDisabled', 'systemSettings')
            }
            color={cell.getValue<boolean>() ? 'success' : 'default'}
          />
        ),
      },
    ],
    [t, locale]
  );

  // MRT v3.2.1's MRT_Localization type lacks globalSearch/columns; they are
  // still consumed by older MRT internals, so pass them as an extension.
  const mrtLocalization: Partial<MRT_Localization> & {
    globalSearch: string;
    columns: string;
  } = {
    noRecordsToDisplay: t('mrtNoRecordsToDisplay', 'systemSettings'),
    rowsPerPage: t('mrtRowsPerPage', 'systemSettings'),
    of: t('mrtOf', 'systemSettings'),
    search: t('mrtSearch', 'systemSettings'),
    clearSearch: t('mrtClearSearch', 'systemSettings'),
    showHideColumns: t('mrtShowHideColumns', 'systemSettings'),
    globalSearch: t('mrtGlobalSearch', 'systemSettings'),
    columns: t('mrtColumns', 'systemSettings'),
    noResultsFound: t('mrtNoResultsFound', 'systemSettings'),
    filterByColumn: t('mrtFilterByColumn', 'systemSettings'),
  };

  return (
    <Box sx={{ p: 3, mx: 'auto', maxWidth: '80rem' }}>
      <PageMeta
        title={t('adminMetaTitle', 'systemSettings')}
        description={t('adminMetaDescription', 'systemSettings')}
      />
      <PageBreadcrumb pageTitle={t('adminPageTitle', 'systemSettings')} />
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {t('adminPageSubtitle', 'systemSettings')}
      </p>
      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <ThemeProvider theme={muiTheme}>
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
            localization={mrtLocalization}
            muiTablePaperProps={{
              elevation: 0,
              sx: { backgroundColor: 'transparent', boxShadow: 'none' },
            }}
            muiTableContainerProps={{
              sx: { backgroundColor: 'transparent' },
            }}
            muiTableHeadCellProps={{
              sx: (theme) => ({
                backgroundColor:
                  theme.palette.mode === 'dark' ? 'transparent' : '#F8FAFC',
                color: theme.palette.mode === 'dark' ? '#94A3B8' : '#475569',
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'none',
                padding: '12px 16px',
                borderBottom: `1px solid ${
                  theme.palette.mode === 'dark' ? '#1F2937' : '#E2E8F0'
                }`,
              }),
            }}
            muiTableBodyCellProps={{
              sx: (theme) => ({
                padding: '12px 16px',
                fontSize: 13,
                color: theme.palette.mode === 'dark' ? '#E2E8F0' : '#334155',
                borderBottom: `1px solid ${
                  theme.palette.mode === 'dark' ? '#1F2937' : '#F1F5F9'
                }`,
              }),
            }}
            muiTableBodyRowProps={({ row }) => ({
              onClick: () => setSelectedCompanyId(row.original.companyId),
              sx: (theme) => ({
                cursor: 'pointer',
                backgroundColor:
                  selectedCompanyId === row.original.companyId
                    ? theme.palette.mode === 'dark'
                      ? 'rgba(228,46,43,0.10)'
                      : 'rgba(228,46,43,0.06)'
                    : undefined,
                '&:hover': {
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(148,163,184,0.06)'
                      : 'rgba(15,23,42,0.04)',
                },
              }),
            })}
            muiTopToolbarProps={{ sx: { backgroundColor: 'transparent' } }}
            muiBottomToolbarProps={{ sx: { backgroundColor: 'transparent' } }}
            muiSearchTextFieldProps={{
              size: 'small',
              sx: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(148,163,184,0.08)'
                      : '#F8FAFC',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'transparent' },
                },
              },
            }}
          />
        </ThemeProvider>
      </div>
      <CompanyUsageDetailDrawer
        companyId={selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
      />
    </Box>
  );
}