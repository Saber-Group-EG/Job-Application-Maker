// @ts-nocheck
// BlueCallerApplicants.tsx - Main Component
import { useEffect, useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  UserPlus,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import PageMeta from '../../../components/common/PageMeta';
import Swal from '../../../utils/swal';
import { applicantsService } from '../../../services/applicantsService';
import { jobPositionsService } from '../../../services/jobPositionsService';
import { getErrorMessage } from '../../../utils/errorHandler';
import type { Applicant } from '../../../types/applicants';
import type { JobPosition } from '../../../types/jobPositions';
import ManualInsert from './components/ManualInsert';
import { Card, EmptyState, PageShell, Segmented } from '../../../components/ui/kit';
import BulkInsert from './components/BulkInsert';
import { useLocale } from '../../../context/LocaleContext';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';

type TabKey = 'manual' | 'bulk';

type Company = {
  _id: string;
  nameEN?: string;
  name?: string | { en: string; ar?: string };
  settings?: {
    defaultColorGradient?: string[];
  };
};

function getTailwindColorClass(_company?: Company | null): {
  bgPrimary: string;
  borderPrimary: string;
  textPrimary: string;
  bgLight: string;
  borderLight: string;
  focusRing: string;
  hoverBg: string;
  gradientFrom: string;
  gradientTo: string;
} {
  return {
    bgPrimary: 'bg-brand-500',
    borderPrimary: 'border-slate-200 dark:border-slate-800',
    textPrimary: 'text-brand-600 dark:text-brand-400',
    bgLight: 'bg-slate-50 dark:bg-slate-800/50',
    borderLight: 'border-slate-300 dark:border-slate-700',
    focusRing: 'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
    hoverBg: 'hover:bg-brand-600',
    gradientFrom: '#e42e2b',
    gradientTo: '#bf1916',
  };
}

function getApiErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  return getErrorMessage(error as never) || fallback;
}



export default function BlueCallerApplicants() {
  const { user } = useAuth();
  const { t } = useLocale();

  const { selectedCompanyId: ctxCompanyId, setSelectedCompanyId } = useCompanyFilter();
  const selectedCompanyId = ctxCompanyId ?? '';
  const [activeTab, setActiveTab] = useState<TabKey>('manual');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [existingApplicants, setExistingApplicants] = useState<Applicant[]>([]);
  const [, setLoadingCompanies] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const userCompanyIds = useMemo<string[] | undefined>(() => {
    if (!user) return [] as string[];
    const roleName = String((user as { roleId?: { name?: string } })?.roleId?.name || '').toLowerCase();
    if (roleName === 'admin' || roleName === 'super admin') return undefined;

    const userRecord = user as {
      companies?: Array<{ companyId?: string | { _id?: string } } | null>;
      assignedcompanyId?: Array<string | undefined>;
    };

    const ids = [
      ...(Array.isArray(userRecord.companies)
        ? userRecord.companies.map((entry) =>
            typeof entry?.companyId === 'string'
              ? entry.companyId
              : (entry?.companyId as { _id?: string } | undefined)?._id
          )
        : []),
      ...(Array.isArray(userRecord.assignedcompanyId)
        ? userRecord.assignedcompanyId.filter(
            (value): value is string => Boolean(value)
          )
        : []),
    ]
      .filter(Boolean)
      .map((value) => String(value));

    return ids.length > 0 ? Array.from(new Set(ids)) : [];
  }, [user]);

  const selectedCompany = companies.find((c) => c._id === selectedCompanyId);
  const themeColors = getTailwindColorClass(selectedCompany);

  // Load companies
  useEffect(() => {
    let mounted = true;

    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const filterQuery =
          userCompanyIds === undefined
            ? {}
            : { companyId: userCompanyIds };

        const allJobPositions = await jobPositionsService.getAllJobPositions({
          ...filterQuery,
          deleted: false,
        });

        const uniqueCompanies = new Map<string, Company>();
        (Array.isArray(allJobPositions) ? allJobPositions : []).forEach(
          (job: JobPosition) => {
            const companyId = String(
              (job?.companyId as { _id?: string } | undefined)?._id || ''
            );
            if (companyId && !uniqueCompanies.has(companyId)) {
              const companyRecord = job.companyId as
                | {
                    _id?: string;
                    name?: string | { en: string; ar?: string };
                    settings?: { defaultColorGradient?: string[] };
                  }
                | undefined;
              uniqueCompanies.set(companyId, {
                _id: companyId,
                nameEN:
                  typeof companyRecord?.name === 'string'
                    ? companyRecord.name
                    : companyRecord?.name?.en,
                name: companyRecord?.name,
                settings: companyRecord?.settings,
              });
            }
          }
        );

        if (mounted) {
          setCompanies(Array.from(uniqueCompanies.values()));
          if (uniqueCompanies.size === 1 && !selectedCompanyId) {
            const [firstCompanyId] = Array.from(uniqueCompanies.keys());
            setSelectedCompanyId(firstCompanyId);
          }
        }
      } catch (error) {
        if (mounted) {
          await Swal.fire({
            title: t('loadFailed', 'common'),
            text: getApiErrorMessage(error, t('failedToLoadCompanies', 'common')),
            icon: 'error',
            confirmButtonText: t('close', 'common'),
          });
        }
      } finally {
        if (mounted) setLoadingCompanies(false);
      }
    };

    loadCompanies();
    return () => { mounted = false; };
  }, [userCompanyIds]);

  // Load job positions + applicants when company changes
  useEffect(() => {
    let mounted = true;

    if (!selectedCompanyId) {
      setJobPositions([]);
      setExistingApplicants([]);
      return;
    }

    const loadData = async () => {
      setLoadingJobs(true);
      try {
        const [positions, applicants] = await Promise.all([
          jobPositionsService.getAllJobPositions({
            companyId: [selectedCompanyId],
            deleted: false,
          }),
          applicantsService.getAllApplicants({
            companyId: [selectedCompanyId],
            fields: 'email,phone,fullName,companyId',
            skipPopulation: true,
          }),
        ]);

        if (!mounted) return;
        setJobPositions(Array.isArray(positions) ? positions : []);
        setExistingApplicants(Array.isArray(applicants) ? applicants : []);
      } catch (error) {
        if (!mounted) return;
        await Swal.fire({
          title: t('loadFailed', 'common'),
          text: getApiErrorMessage(
            error,
            t('failedToLoadData', 'common')
          ),
          icon: 'error',
          confirmButtonText: t('close', 'common'),
        });
      } finally {
        if (mounted) setLoadingJobs(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [selectedCompanyId]);

  return (
    <PageShell title={t('heading', 'blueCaller')} subtitle={t('description', 'blueCaller')}>
      <PageMeta
        title={t('pageMetaTitle', 'blueCaller')}
        description={t('pageMetaDesc', 'blueCaller')}
      />

        <Segmented
          role="tablist"
          ariaLabel={t('heading', 'blueCaller')}
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'manual' as const, icon: <UserPlus className="size-4" />, label: t('tabManualInsert', 'blueCaller') },
            { value: 'bulk' as const, icon: <FileSpreadsheet className="size-4" />, label: t('tabBulkInsert', 'blueCaller') },
          ]}
        />

        {/* No company selected guard */}
        {!selectedCompanyId ? (
          <Card>
            <EmptyState
              icon={<Building2 className="size-6" />}
              title={t('noCompanySelectedHeading', 'blueCaller')}
              text={t('noCompanySelectedDesc', 'blueCaller')}
            />
          </Card>
        ) : activeTab === 'manual' ? (
          <ManualInsert
            companyId={selectedCompanyId}
            jobPositions={jobPositions}
            existingApplicants={existingApplicants}
            loadingJobs={loadingJobs}
            themeColors={themeColors}
            onSuccess={() => {
              // Refresh applicants list after successful insert
              const refreshData = async () => {
                const applicants = await applicantsService.getAllApplicants({
                  companyId: [selectedCompanyId],
                  fields: 'email,phone,fullName,companyId',
                  skipPopulation: true,
                });
                setExistingApplicants(Array.isArray(applicants) ? applicants : []);
              };
              refreshData();
            }}
          />
        ) : (
          <BulkInsert
            companyId={selectedCompanyId}
            jobPositions={jobPositions}
            existingApplicants={existingApplicants}
            themeColors={themeColors}
            onSuccess={() => {
              // Refresh applicants list after successful bulk insert
              const refreshData = async () => {
                const applicants = await applicantsService.getAllApplicants({
                  companyId: [selectedCompanyId],
                  fields: 'email,phone,fullName,companyId',
                  skipPopulation: true,
                });
                setExistingApplicants(Array.isArray(applicants) ? applicants : []);
              };
              refreshData();
            }}
          />
        )}
    </PageShell>
  );
}
