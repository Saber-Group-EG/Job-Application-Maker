// services/plansAdminService.ts
import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';
import { ApiError } from './companiesService';
import type { Plan } from '../types/companies';

class PlansAdminService {
  private async request<T>(
    method: 'get' | 'patch',
    url: string,
    data?: any
  ): Promise<T> {
    try {
      const response =
        method === 'get' ? await axios.get(url) : await axios.patch(url, data);
      return (response.data?.data ?? response.data?.plan ?? response.data) as T;
    } catch (error: any) {
      throw new ApiError(
        getErrorMessage(error),
        error.response?.status,
        error.response?.data?.details,
        error.response?.data?.code,
        error.response?.data?.featurePath
      );
    }
  }

  listPlans(): Promise<Plan[]> {
    return this.request<Plan[]>('get', '/plans');
  }

  updatePlanFeature(
    id: string,
    payload: { path: string; allowed?: boolean; limit?: number | null }
  ): Promise<Plan> {
    return this.request<Plan>(
      'patch',
      `/plans/${encodeURIComponent(id)}/features`,
      payload
    );
  }
}

export const plansAdminService = new PlansAdminService();
