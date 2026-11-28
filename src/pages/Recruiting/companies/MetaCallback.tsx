import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import Swal from '../../../utils/swal';
import { useLocale } from '../../../context/LocaleContext';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { useQueryClient } from '@tanstack/react-query';
import { jobDistributionKeys } from '../../../hooks/queries/useJobDistribution';
import { jobDistributionService } from '../../../services/jobDistributionService';
import { paths } from '../../../router/Paths';

/**
 * Facebook sends people here after "Connect Facebook". We hand the login code
 * to the server (which stores the Pages), then go back to Company settings.
 */
export default function MetaCallback() {
  const { t } = useLocale();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setSelectedCompanyId } = useCompanyFilter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    const state = params.get('state');
    const denied = params.get('error_description') || params.get('error_message') || params.get('error');

    const finish = async () => {
      if (denied || !code || !state) {
        setError(denied || t('fbCallbackMissing', 'companies'));
        return;
      }
      try {
        const result = await jobDistributionService.metaFinish({ code, state });
        const { companyId, ...metaState } = result;
        queryClient.setQueryData(jobDistributionKeys.meta(companyId), metaState);
        setSelectedCompanyId(companyId);
        navigate(paths.recruiting.integrations, { replace: true });
        Swal.fire({
          icon: 'success',
          title: t('fbConnectedTitle', 'companies'),
          text: t('fbConnectedText', 'companies', { count: String(metaState.pages.length) }),
        });
      } catch (err) {
        setError((err as Error)?.message || String(err));
      }
    };
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      {error ? (
        <div className="space-y-4">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('fbConnectFailed', 'companies')}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <button
            type="button"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            onClick={() => navigate(paths.recruiting.integrations, { replace: true })}
          >
            {t('fbBackToSettings', 'companies')}
          </button>
        </div>
      ) : (
        <p className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Loader2 className="size-4 animate-spin" />
          {t('fbFinishing', 'companies')}
        </p>
      )}
    </div>
  );
}
