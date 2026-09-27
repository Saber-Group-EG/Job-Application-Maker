import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  CircleCheckBig,
  Bot,
  FileSearch,
  UserRound,
  Mail,
  Filter,
  ListChecks,
  ClipboardCheck,
  FileText,
  Loader2,
} from 'lucide-react';
import Swal from '../../../utils/swal';
import { Card, CardToolbar, EmptyState, NoAccess, SectionTitle, Switch } from '../../../components/ui/kit';
import SettingsSection from './components/SettingsSection';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import {
  useCompanies,
  useUpdateCompanyAiFeatures,
} from '../../../hooks/queries/useCompanies';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import type { AiFeature, AiFeatureToggle } from '../../../types/companies';

type Props = {
  companyId?: string;
  onSaved?: (featureToggles: AiFeatureToggle[]) => void;
  onChange?: (featureToggles: AiFeatureToggle[]) => void;
  embedded?: boolean;
};

type CompanyShape = {
  _id: string;
  name?: string | { en?: string; ar?: string };
  settings?: {
    _id?: string;
    company?: string;
    aiSettings?: {
      featureToggles?: Partial<Record<AiFeature, boolean>>;
    };
  };
};

const ALL_FEATURES: AiFeature[] = [
  'matchScore',
  'nlFilters',
  'cvParse',
  'jobFieldGenerator',
  'candidateSummary',
  'emailDrafting',
  'interviewQuestionGen',
  'interviewScoring',
];

const TOGGLEABLE_FEATURES: AiFeature[] = [
  'matchScore',
  'nlFilters',
  'cvParse',
];

const FEATURE_ICONS: Record<AiFeature, typeof Sparkles> = {
  jobFieldGenerator: Bot,
  matchScore: FileSearch,
  candidateSummary: UserRound,
  emailDrafting: Mail,
  nlFilters: Filter,
  interviewQuestionGen: ListChecks,
  interviewScoring: ClipboardCheck,
  cvParse: FileText,
};

const normalizeFeatureToggles = (
  toggles: unknown
): AiFeatureToggle[] => {
  if (!toggles || typeof toggles !== 'object') return [];

  const fromMap = (map: Record<string, unknown>): AiFeatureToggle[] =>
    ALL_FEATURES.map((feature) => ({
      feature,
      enabled: Boolean(map[feature]),
    }));

  if (Array.isArray(toggles)) {
    const enabled = new Set<AiFeature>();
    const normalized = toggles
      .filter(
        (t): t is AiFeatureToggle =>
          !!t &&
          typeof t === 'object' &&
          ALL_FEATURES.includes((t as AiFeatureToggle).feature) &&
          typeof (t as AiFeatureToggle).enabled === 'boolean'
      )
      .map((t) => {
        enabled.add(t.feature);
        return { feature: t.feature, enabled: t.enabled };
      });

    return [
      ...ALL_FEATURES.filter((f) => !enabled.has(f)).map((f) => ({
        feature: f,
        enabled: false,
      })),
      ...normalized,
    ];
  }

  return fromMap(toggles as Record<string, unknown>);
};

const getCompanyName = (
  company: CompanyShape | undefined,
  t: (key: string, ns: string) => string,
  locale?: string
): string => {
  if (!company) return t('aiFeatures.noCompany', 'settings');
  if (typeof company.name === 'string') return company.name;
  if (locale === 'ar')
    return (
      company.name?.ar ||
      company.name?.en ||
      t('aiFeatures.unnamedCompany', 'settings')
    );
  return (
    company.name?.en ||
    company.name?.ar ||
    t('aiFeatures.unnamedCompany', 'settings')
  );
};

export default function AiFeaturesTab({
  companyId: _companyId,
  onChange,
  embedded = false,
}: Props) {
  const { hasPermission } = useAuth();
  const { t, locale } = useLocale();
  const { data: companies = [], isLoading: isCompaniesLoading } = useCompanies();

  const { selectedCompanyId } = useCompanyFilter();

  const canRead =
    hasPermission('Company Management', 'read') ||
    hasPermission('Settings Management', 'read');

  const [featureToggles, setFeatureToggles] = useState<AiFeatureToggle[]>([]);

  const effectiveCompanyId =
    selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;
  const selectedCompany = useMemo(
    () =>
      (companies as CompanyShape[]).find(
        (company) => company._id === effectiveCompanyId
      ),
    [companies, effectiveCompanyId]
  );

  const updateAiFeaturesMutation = useUpdateCompanyAiFeatures();

  const derivedFeatureToggles = useMemo(
    () =>
      normalizeFeatureToggles(
        selectedCompany?.settings?.aiSettings?.featureToggles
      ),
    [selectedCompany]
  );

  const isLoading = isCompaniesLoading;

  useEffect(() => {
    setFeatureToggles(
      derivedFeatureToggles.map((f) => ({
        feature: f.feature,
        enabled: f.enabled,
      }))
    );
  }, [derivedFeatureToggles]);

  useEffect(() => {
    onChange?.(featureToggles);
  }, [onChange, featureToggles]);

  const enabledCount = featureToggles.filter((f) => f.enabled).length;

  const toggleFeature = (feature: AiFeature, enabled: boolean) => {
    if (!TOGGLEABLE_FEATURES.includes(feature)) return;

    const previous = featureToggles;
    const next = previous.map((f) =>
      f.feature === feature ? { ...f, enabled } : f
    );
    setFeatureToggles(next);

    const settingsId = selectedCompany?.settings?._id;
    if (!settingsId) {
      Swal.fire(
        t('aiFeatures.validationSelectCompany', 'settings'),
        t('aiFeatures.validationSelectCompany', 'settings'),
        'warning'
      );
      setFeatureToggles(previous);
      return;
    }

    updateAiFeaturesMutation
      .mutateAsync({ settingsId, featureToggles: next })
      .catch(() => setFeatureToggles(previous));
  };

  if (!canRead) {
    if (embedded) {
      return (
        <Card>
          <EmptyState
            icon={<ShieldCheck className="size-6" />}
            title={t('aiFeatures.noPermissionTitle', 'settings')}
            text={t('aiFeatures.noPermissionDesc', 'settings')}
          />
        </Card>
      );
    }
    return <NoAccess title={t('aiFeatures.noPermissionTitle', 'settings')} text={t('aiFeatures.noPermissionDesc', 'settings')} />;
  }

  return (
    <SettingsSection
      embedded={embedded}
      metaTitle={t('aiFeatures.pageMetaTitle', 'settings')}
      metaDescription={t('aiFeatures.pageMetaDesc', 'settings')}
      icon={<Sparkles className="size-4" />}
      title={t('aiFeatures.title', 'settings')}
      description={t('aiFeatures.description', 'settings')}
      stats={[
        { label: t('aiFeatures.statCompany', 'settings'), value: getCompanyName(selectedCompany, t, locale) },
        { label: t('aiFeatures.statEnabled', 'settings'), value: `${enabledCount} / ${featureToggles.length}` },
        {
          label: t('aiFeatures.statSaveStatus', 'settings'),
          value: (
            <>
              <CircleCheckBig className="size-4" /> {t('aiFeatures.statReady', 'settings')}
            </>
          ),
          tone: 'success',
        },
      ]}
    >
      <Card>
        <CardToolbar>
          <div>
            <SectionTitle icon={<Sparkles className="size-4" />}>{t('aiFeatures.featuresTitle', 'settings')}</SectionTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('aiFeatures.featuresDesc', 'settings')}</p>
          </div>
        </CardToolbar>

        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-slate-500 dark:text-slate-400" role="status">
            <Loader2 className="size-4 animate-spin" />
            {t('aiFeatures.loading', 'settings')}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {featureToggles.map((item) => {
              const Icon = FEATURE_ICONS[item.feature];
              const title = t(`aiFeatures.${item.feature}.title`, 'settings');
              return (
                <li key={item.feature} className="flex items-center gap-4 px-4 py-4">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      item.enabled
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {t(`aiFeatures.${item.feature}.desc`, 'settings')}
                    </p>
                  </div>
                  <Switch
                    label={title}
                    checked={item.enabled}
                    disabled={!TOGGLEABLE_FEATURES.includes(item.feature)}
                    onChange={(checked) => toggleFeature(item.feature, checked)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </SettingsSection>
  );
}
