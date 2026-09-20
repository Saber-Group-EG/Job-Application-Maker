// hooks/queries/usePromos.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { promosService } from "../../services/promosService";
import { ApiError } from "../../services/companiesService";
import Swal from "../../utils/swal";
import { useLocale } from "../../context/LocaleContext";
import type {
  PromoCodeListEnvelope,
  MyPromoCodesEnvelope,
  PromoCodePayload,
  PromoRedemptionListEnvelope,
  PromoCommissionListEnvelope,
  PromoCommissionReport,
  MyCommissionLedger,
  SettleCommissionsPayload,
  SettleCommissionsResult,
} from "../../types/promos";

// ===== Query Keys =====
export const promosKeys = {
  all: ["promos"] as const,
  codes: () => [...promosKeys.all, "codes"] as const,
  codeList: (params: Record<string, unknown>) =>
    [...promosKeys.codes(), "list", params] as const,
  codeDetail: (id: string) => [...promosKeys.codes(), "detail", id] as const,
  commissions: () => [...promosKeys.all, "commissions"] as const,
  report: (month?: string) =>
    [...promosKeys.commissions(), "report", { month }] as const,
  ledger: (params: Record<string, unknown>) =>
    [...promosKeys.commissions(), "ledger", params] as const,
  redemptions: () => [...promosKeys.all, "redemptions"] as const,
  redemptionList: (params: Record<string, unknown>) =>
    [...promosKeys.redemptions(), "list", params] as const,
  my: () => [...promosKeys.all, "my"] as const,
  myCodes: (params: Record<string, unknown>) =>
    [...promosKeys.my(), "codes", params] as const,
  myCommissions: (month?: string) =>
    [...promosKeys.my(), "commissions", { month }] as const,
  myRedemptions: (params: Record<string, unknown>) =>
    [...promosKeys.my(), "redemptions", params] as const,
};

// ===== Toast helpers =====
function showSuccessToast(message: string, t: (key: string, ns?: string) => string) {
  Swal.fire({
    title: t('success', 'common'),
    text: message,
    icon: 'success',
    timer: 1500,
    showConfirmButton: false,
  });
}

function showErrorToast(message: string, fallback: string, t: (key: string, ns?: string) => string) {
  Swal.fire({
    title: t('error', 'common'),
    text: message || fallback,
    icon: 'error',
  });
}

// ===== Admin: Promo Codes =====
export function usePromoCodes(params?: {
  ownerUserId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: promosKeys.codeList(params ?? {}),
    queryFn: (): Promise<PromoCodeListEnvelope> =>
      promosService.getAllCodes(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePromoCode(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: promosKeys.codeDetail(id ?? ''),
    queryFn: () => promosService.getCodeById(id!),
    enabled: options?.enabled ?? !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePromoCode() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (payload: PromoCodePayload) => promosService.createCode(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promosKeys.codes() });
      showSuccessToast(t('codeCreated', 'promos'), t);
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('codeCreateFailed', 'promos'), t);
    },
  });
}

export function useUpdatePromoCode() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PromoCodePayload }) =>
      promosService.updateCode(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: promosKeys.codeDetail(id) });
      queryClient.invalidateQueries({ queryKey: promosKeys.codes() });
      showSuccessToast(t('codeUpdated', 'promos'), t);
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('codeUpdateFailed', 'promos'), t);
    },
  });
}

// ===== Admin: Commissions =====
export function useCommissionReport(month?: string) {
  return useQuery({
    queryKey: promosKeys.report(month),
    queryFn: (): Promise<PromoCommissionReport> =>
      promosService.getCommissionReport(month),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCommissions(params?: {
  month?: string;
  hrUserId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: promosKeys.ledger(params ?? {}),
    queryFn: (): Promise<PromoCommissionListEnvelope> =>
      promosService.getCommissions(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSettleCommissions() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (payload: SettleCommissionsPayload): Promise<SettleCommissionsResult> =>
      promosService.settleCommissions(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: promosKeys.commissions() });
      showSuccessToast(
        t('settleDone', 'promos', { matched: result.matched, paid: result.paid }),
        t
      );
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('settleFailed', 'promos'), t);
    },
  });
}

// ===== Admin: Redemptions =====
export function usePromoRedemptions(params?: {
  promoCodeId?: string;
  status?: string;
  companyId?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: promosKeys.redemptionList(params ?? {}),
    queryFn: (): Promise<PromoRedemptionListEnvelope> =>
      promosService.getRedemptions(params),
    staleTime: 2 * 60 * 1000,
  });
}

// ===== HR self-service =====
export function useMyPromoCodes(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: promosKeys.myCodes(params ?? {}),
    queryFn: (): Promise<MyPromoCodesEnvelope> => promosService.getMyCodes(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMyPromoCode() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (payload: Omit<PromoCodePayload, 'ownerUserId'>) =>
      promosService.createMyCode(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promosKeys.my() });
      showSuccessToast(t('codeCreated', 'promos'), t);
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, t('codeCreateFailed', 'promos'), t);
    },
  });
}

export function useMyCommissions(month?: string) {
  return useQuery({
    queryKey: promosKeys.myCommissions(month),
    queryFn: (): Promise<MyCommissionLedger> =>
      promosService.getMyCommissions(month),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyPromoRedemptions(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: promosKeys.myRedemptions(params ?? {}),
    queryFn: (): Promise<PromoRedemptionListEnvelope> =>
      promosService.getMyRedemptions(params),
    staleTime: 2 * 60 * 1000,
  });
}