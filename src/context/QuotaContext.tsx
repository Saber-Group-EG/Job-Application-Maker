import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useCompanyFilter } from './CompanyFilterContext';
import { useCompanies, useSubscription } from '../hooks/queries/useCompanies';
import { useAuth } from './AuthContext';
import { subscribeQuotaEvent } from '../lib/quotaEvents';

type CompanyShape = { _id: string };

interface QuotaContextType {
  nearLimit: boolean;
  bannerDismissed: boolean;
  dismissBanner: () => void;
  quotaExceeded: boolean;
  canRenew: boolean;
  renewPath: string;
}

const QuotaContext = createContext<QuotaContextType | undefined>(undefined);

export const useQuota = () => {
  const ctx = useContext(QuotaContext);
  if (!ctx) {
    throw new Error('useQuota must be used within a QuotaProvider');
  }
  return ctx;
};

const RENEW_PATH = '/recruiting/subscription';

export const QuotaProvider = ({ children }: { children: ReactNode }) => {
  const { hasPermission } = useAuth();
  const canRenew = hasPermission('Billing Management', 'write');

  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;
  // Poll in the background so the banner/blocker can appear without a full reload.
  const { data } = useSubscription(companyId ?? '', {
    refetchInterval: 5 * 60 * 1000,
  });
  const cycleKey = data?.subscription?.lastPaymentAt ?? null;

  const [dismissedCycleKey, setDismissedCycleKey] = useState<string | null>(
    null
  );
  const bannerDismissed =
    dismissedCycleKey !== null && dismissedCycleKey === cycleKey;

  const dismissBanner = () => {
    if (cycleKey) setDismissedCycleKey(cycleKey);
  };

  // --- quotaExceeded: instant on 402, self-heals from the next clean poll ---
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    return subscribeQuotaEvent('quota-exceeded', () => setQuotaExceeded(true));
  }, []);

  useEffect(() => {
    if (!data?.usage) return;
    setQuotaExceeded(data.usage.used >= data.usage.effectiveLimit);
  }, [data?.usage?.used, data?.usage?.effectiveLimit]);

  const [nearLimit, setNearLimit] = useState(false);

  useEffect(() => {
    return subscribeQuotaEvent('near-limit-companies', (ids) => {
      if (!companyId) return;
      if (ids.includes(companyId)) setNearLimit(true);
    });
  }, [companyId]);

  useEffect(() => {
    if (data?.usage?.nearLimit === undefined) return;
    setNearLimit(data.usage.nearLimit);
  }, [data?.usage?.nearLimit]);

  const value = useMemo(
    () => ({
      nearLimit,
      bannerDismissed,
      dismissBanner,
      quotaExceeded,
      canRenew,
      renewPath: RENEW_PATH,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nearLimit, bannerDismissed, cycleKey, quotaExceeded, canRenew]
  );

  return (
    <QuotaContext.Provider value={value}>{children}</QuotaContext.Provider>
  );
};
