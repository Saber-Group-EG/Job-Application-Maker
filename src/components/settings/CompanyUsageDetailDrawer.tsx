// components/CompanyUsageDetailDrawer.tsx
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
import Switch from '../../components/form/switch/Switch'; // adjust path to wherever this lives
import {
  useCompanyUsageDetail,
  useCompRequestQuota,
  useCompAiCredits,
  useToggleAiFeature,
  useToggleAiEnabled,
} from '../../hooks/queries/useSystemSettings';

const FEATURE_LABELS: Record<string, string> = {
  jobFieldGenerator: 'Job Field Generator',
  matchScore: 'Match Score',
  candidateSummary: 'Candidate Summary',
  emailDrafting: 'Email Drafting',
  nlFilters: 'NL Filters',
  interviewQuestionGen: 'Interview Question Gen',
  offerGenerator: 'Offer Generator',
  contractGenerator: 'Contract Generator',
  cvParse: 'CV Parser',
};

export default function CompanyUsageDetailDrawer({
  companyId,
  onClose,
}: {
  companyId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useCompanyUsageDetail(companyId);
  const compQuota = useCompRequestQuota();
  const compCredits = useCompAiCredits();
  const toggleFeature = useToggleAiFeature();
  const toggleAiEnabled = useToggleAiEnabled();

  const [quotaAmount, setQuotaAmount] = useState('');
  const [creditsAmount, setCreditsAmount] = useState('');

  return (
    <Drawer anchor="right" open={!!companyId} onClose={onClose}>
      <Box sx={{ width: 420, p: 3 }}>
        {isLoading || !data ? (
          <LinearProgress />
        ) : (
          <Stack spacing={3}>
            <Typography variant="h6">
              {data.subscription?.companyId?.name.en}
            </Typography>

            <Box>
              <Typography variant="subtitle2">Request Quota</Typography>
              <Typography variant="body2">
                {data.requestUsage?.count ?? 0} used this cycle
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label="Comp amount"
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
                  Comp
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2">AI Credits ($)</Typography>
              <Typography variant="body2">
                ${data.aiUsage?.currentUsage?.toFixed(2) ?? '0.00'} used
                {data.aiUsage?.compedCredits
                  ? ` (${data.aiUsage.compedCredits} comped)`
                  : ''}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label="Comp amount"
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
                  Comp
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
                <Typography variant="subtitle1">AI Enabled</Typography>
                <Switch
                  label=""
                  checked={!!data.aiSettings?.enabled}
                  disabled={toggleAiEnabled.isPending}
                  onChange={(checked) =>
                    companyId &&
                    toggleAiEnabled.mutate({ companyId, enabled: checked })
                  }
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Master switch — disabling this blocks every AI feature for the
                company regardless of individual toggles below.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                AI Features
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
                        label=""
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
