// @ts-nocheck
// BlueCallerApplicants.tsx - Main Component
import { useEffect, useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
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

function getTailwindColorClass(company?: Company | null): {
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
    borderPrimary: 'border-brand-100',
    textPrimary: 'text-brand-700',
    bgLight: 'bg-gray-100',
    borderLight: 'border-brand-100',
    focusRing: 'focus:border-brand-500 focus:ring-brand-100',
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

  const { selectedCompanyId: ctxCompanyId, setSelectedCompanyId, companies: contextCompanies } = useCompanyFilter();
  const selectedCompanyId = ctxCompanyId ?? '';
  const [activeTab, setActiveTab] = useState<TabKey>('manual');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [existingApplicants, setExistingApplicants] = useState<Applicant[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
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
    <div
      className={`min-h-screen bg-gray-100 px-4 py-6 text-gray-900 sm:px-6 lg:px-8 dark:bg-gray-900 dark:text-gray-100`}
    >
      <PageMeta
        title={t('pageMetaTitle', 'blueCaller')}
        description={t('pageMetaDesc', 'blueCaller')}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Company Selector Header */}
        <section
          className="overflow-hidden rounded-3xl border shadow-2xl p-6 sm:p-8 text-white"
          style={{
            background: `linear-gradient(135deg, ${themeColors.gradientFrom} 0%, ${themeColors.gradientTo} 100%)`,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                <Sparkles className="h-4 w-4" />
                {t('badgeText', 'blueCaller')}
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
                {t('heading', 'blueCaller')}
              </h1>
              <p className="max-w-2xl text-sm text-white/90 sm:text-base">
                {t('description', 'blueCaller')}
              </p>
            </div>

          </div>
        </section>

        {/* Tab switcher */}
        <div
          className={`rounded-2xl border ${themeColors.borderPrimary} bg-white p-2 shadow-sm dark:bg-gray-800`}
        >
          <div className="grid grid-cols-2 gap-2 sm:w-fit">
            {(
              [
                { key: 'manual', icon: UserPlus, label: t('tabManualInsert', 'blueCaller') },
                { key: 'bulk', icon: FileSpreadsheet, label: t('tabBulkInsert', 'blueCaller') },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === key
                    ? `${themeColors.bgPrimary} text-white shadow-lg`
                    : `${themeColors.bgLight} dark:bg-gray-700 ${themeColors.textPrimary} dark:text-brand-300 hover:bg-gray-200 dark:hover:bg-gray-600`
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* No company selected guard */}
        {!selectedCompanyId ? (
          <div
            className={`rounded-3xl border ${themeColors.borderPrimary} bg-white p-8 text-center shadow-xl dark:bg-gray-800`}
          >
            <Building2 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500" />
            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-200">
              {t('noCompanySelectedHeading', 'blueCaller')}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('noCompanySelectedDesc', 'blueCaller')}
            </p>
          </div>
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
      </div>
    </div>
  );
}