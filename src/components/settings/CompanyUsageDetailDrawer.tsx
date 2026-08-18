import { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  TextField,
  Button,
  Stack,
  LinearProgress,
} from '@mui/material';
import Switch from '../../components/form/switch/Switch';
import { useLocale } from '../../context/LocaleContext';
import {
  useCompanyUsageDetail,
  useCompRequestQuota,
  useCompAiCredits,
  useToggleAiFeature,
  useToggleAiEnabled,
} from '../../hooks/queries/useSystemSettings';

export default function CompanyUsageDetailDrawer({
  companyId,
  onClose,
}: {
  companyId: string | null;
  onClose: () => void;
}) {
  const { t, dir } = useLocale();
  const { data, isLoading } = useCompanyUsageDetail(companyId);
  const compQuota = useCompRequestQuota();
  const compCredits = useCompAiCredits();
  const toggleFeature = useToggleAiFeature();
  const toggleAiEnabled = useToggleAiEnabled();

  const [quotaAmount, setQuotaAmount] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('');

  const FEATURE_LABELS: Record<string, string> = {
    jobFieldGenerator: t('featureJobFieldGenerator', 'systemSettings'),
    matchScore: t('featureMatchScore', 'systemSettings'),
    candidateSummary: t('featureCandidateSummary', 'systemSettings'),
    emailDrafting: t('featureEmailDrafting', 'systemSettings'),
    nlFilters: t('featureNlFilters', 'systemSettings'),
    interviewQuestionGen: t('featureInterviewQuestionGen', 'systemSettings'),
    offerGenerator: t('featureOfferGenerator', 'systemSettings'),
    contractGenerator: t('featureContractGenerator', 'systemSettings'),
    cvParse: t('featureCvParse', 'systemSettings'),
  };

  return (
    <Drawer
      anchor={dir === 'rtl' ? 'left' : 'right'}
      open={!!companyId}
      onClose={onClose}
    >
      <Box
        sx={{ width: 420, p: 3 }}
        role="dialog"
        aria-label={t('drawerAriaLabel', 'systemSettings')}
      >
        {isLoading || !data ? (
          <LinearProgress />
        ) : (
          <Stack spacing={3}>
            <Typography variant="h6">
              {data.subscription?.companyId?.name.en}
            </Typography>

            <Box>
              <Typography variant="subtitle2">
                {t('drawerRequestQuota', 'systemSettings')}
              </Typography>
              <Typography variant="body2">
                {t('drawerUsedThisCycle', 'systemSettings', {
                  count: data.requestUsage?.count ?? 0,
                })}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label={t('drawerCompAmount', 'systemSettings')}
                  type="number"
                  value={quotaAmount}
                  onChange={(e) => setQuotaAmount(e.target.value)}
                />
                <Button
                  variant="outlined"
                  disabled={!quotaAmount || compQuota.isPending}
                  onClick={() =>
                    companyId &&
                    compQuota.mutate(
                      { companyId, amount: Number(quotaAmount) },
                      { onSuccess: () => setQuotaAmount('') }
                    )
                  }
                >
                  {t('drawerCompButton', 'systemSettings')}
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2">
                {t('drawerAiCredits', 'systemSettings')}
              </Typography>
              <Typography variant="body2">
                {t('drawerUsedAmount', 'systemSettings', {
                  amount: data.aiUsage?.currentUsage?.toFixed(2) ?? '0.00',
                })}
                {data.aiUsage?.compedCredits
                  ? ` ${t('drawerComped', 'systemSettings', {
                      count: data.aiUsage.compedCredits,
                    })}`
                  : ''}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label={t('drawerCompAmount', 'systemSettings')}
                  type="number"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
                />
                <Button
                  variant="outlined"
                  disabled={!creditsAmount || compCredits.isPending}
                  onClick={() =>
                    companyId &&
                    compCredits.mutate(
                      { companyId, amount: Number(creditsAmount) },
                      { onSuccess: () => setCreditsAmount('') }
                    )
                  }
                >
                  {t('drawerCompButton', 'systemSettings')}
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle1">
                  {t('drawerAiEnabled', 'systemSettings')}
                </Typography>
                <Switch
                  label={t('drawerAiEnabled', 'systemSettings')}
                  checked={!!data.aiSettings?.enabled}
                  disabled={toggleAiEnabled.isPending}
                  onChange={(checked) =>
                    companyId &&
                    toggleAiEnabled.mutate({ companyId, enabled: checked })
                  }
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t('drawerAiEnabledHelp', 'systemSettings')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('drawerAiFeatures', 'systemSettings')}
              </Typography>
              <Stack spacing={0.5}>
                {Object.entries(data.aiSettings?.featureToggles ?? {}).map(
                  ([key, enabled]) => (
                    <Stack
                      key={key}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2">
                        {FEATURE_LABELS[key] ?? key}
                      </Typography>
                      <Switch
                        label={FEATURE_LABELS[key] ?? key}
                        checked={!!enabled}
                        disabled={toggleFeature.isPending}
                        onChange={(checked) =>
                          companyId &&
                          toggleFeature.mutate({
                            companyId,
                            feature: key,
                            enabled: checked,
                          })
                        }
                      />
                    </Stack>
                  )
                )}
              </Stack>
            </Box>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}