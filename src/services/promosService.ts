// services/promosService.ts
import axios from "../config/axios";
import { getErrorMessage } from "../utils/errorHandler";
import { ApiError } from "./companiesService";
import type {
  PromoCode,
  PromoCodeListEnvelope,
  MyPromoCodesEnvelope,
  PromoCodePayload,
  PromoRedemptionListEnvelope,
  PromoCommissionListEnvelope,
  PromoCommissionReport,
  MyCommissionLedger,
  SettleCommissionsPayload,
  SettleCommissionsResult,
} from "../types/promos";

class PromosService {
  /**
   * Generic request helper.
   *
   * The promo API deliberately uses two different response envelopes:
   *  - `{ message: 'Success', data: <T> }` (shared handler)
   *  - `{ success: true, data: <T>, page, totalCount, ... }` (legacy shape)
   *
   * When `fullEnvelope` is false we unwrap to `data` (single-object ops).
   * When `fullEnvelope` is true we return the whole body so list metadata
   * (page/limit/totalCount/totalPages/summary) is preserved.
   */
  private async request<T>(
    method: 'get' | 'post' | 'patch',
    url: string,
    options: {
      data?: unknown;
      params?: unknown;
      fullEnvelope?: boolean;
    } = {}
  ): Promise<T> {
    try {
      const { data, params, fullEnvelope = false } = options;
      const config = { params };
      const response =
        method === 'get'
          ? await axios[method](url, config)
          : await axios[method](url, data, config);

      return (
        fullEnvelope ? response.data : response.data?.data ?? response.data
      ) as T;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { details?: unknown } } };
      throw new ApiError(
        getErrorMessage(error),
        err.response?.status,
        err.response?.data?.details
      );
    }
  }

  // ── Admin ────────────────────────────────────────────────────────────────
  async createCode(payload: PromoCodePayload): Promise<PromoCode> {
    return this.request<PromoCode>('post', '/promos', {
      data: payload,
    });
  }

  async getAllCodes(params?: {
    ownerUserId?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PromoCodeListEnvelope> {
    return this.request<PromoCodeListEnvelope>('get', '/promos', {
      params,
      fullEnvelope: true,
    });
  }

  async getCodeById(id: string): Promise<PromoCode> {
    return this.request<PromoCode>('get', `/promos/${id}`);
  }

  async updateCode(id: string, payload: PromoCodePayload): Promise<PromoCode> {
    return this.request<PromoCode>('patch', `/promos/${id}`, {
      data: payload,
    });
  }

  async getCommissionReport(month?: string): Promise<PromoCommissionReport> {
    return this.request<PromoCommissionReport>('get', '/promos/commissions/report', {
      params: month ? { month } : undefined,
    });
  }

  async getCommissions(params?: {
    month?: string;
    hrUserId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PromoCommissionListEnvelope> {
    return this.request<PromoCommissionListEnvelope>('get', '/promos/commissions', {
      params,
      fullEnvelope: true,
    });
  }

  async settleCommissions(payload: SettleCommissionsPayload): Promise<SettleCommissionsResult> {
    return this.request<SettleCommissionsResult>('post', '/promos/commissions/settle', {
      data: payload,
    });
  }

  async getRedemptions(params?: {
    promoCodeId?: string;
    status?: string;
    companyId?: string;
    page?: number;
  }): Promise<PromoRedemptionListEnvelope> {
    return this.request<PromoRedemptionListEnvelope>('get', '/promos/redemptions', {
      params,
      fullEnvelope: true,
    });
  }

  // ── HR self-service (/my) ────────────────────────────────────────────────
  async createMyCode(payload: Omit<PromoCodePayload, 'ownerUserId'>): Promise<PromoCode> {
    return this.request<PromoCode>('post', '/promos/my', {
      data: payload,
    });
  }

  async getMyCodes(params?: {
    page?: number;
    limit?: number;
  }): Promise<MyPromoCodesEnvelope> {
    return this.request<MyPromoCodesEnvelope>('get', '/promos/my', {
      params,
      fullEnvelope: true,
    });
  }

  async getMyCommissions(month?: string): Promise<MyCommissionLedger> {
    return this.request<MyCommissionLedger>('get', '/promos/my/commissions', {
      params: month ? { month } : undefined,
    });
  }

  async getMyRedemptions(params?: {
    status?: string;
    page?: number;
  }): Promise<PromoRedemptionListEnvelope> {
    return this.request<PromoRedemptionListEnvelope>('get', '/promos/my/redemptions', {
      params,
      fullEnvelope: true,
    });
  }
}

export const promosService = new PromosService();