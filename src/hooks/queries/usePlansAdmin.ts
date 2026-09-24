import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { plansAdminService } from '../../services/plansAdminService';
import type { Plan } from '../../types/companies';

export const plansAdminKeys = {
  all: ['plansAdmin'] as const,
  list: () => [...plansAdminKeys.all, 'list'] as const,
};

export function useAdminPlans() {
  return useQuery({
    queryKey: plansAdminKeys.list(),
    queryFn: () => plansAdminService.listPlans(),
  });
}

// Local mirror of the backend's dot-path node walk (src/utils/planFeaturePath.js)
// for the optimistic cache update below.
function setFeatureNode(
  plan: Plan,
  path: string,
  patch: { allowed?: boolean; limit?: number | null; value?: string }
): Plan {
  if (!plan.features) return plan;
  const keys = path.split('.');
  const leafKey = keys.pop() as string;
  const cloned: any = JSON.parse(JSON.stringify(plan.features));
  let node = cloned;
  for (const key of keys) {
    if (!node[key]) node[key] = {};
    node = node[key];
  }
  // String settings are plain leaves; everything else is { allowed, limit }.
  node[leafKey] =
    patch.value !== undefined
      ? patch.value
      : { ...node[leafKey], allowed: patch.allowed ?? node[leafKey]?.allowed, ...(patch.limit !== undefined && { limit: patch.limit }) };
  return { ...plan, features: cloned };
}

// Single shared mutation for the whole comparison page — planId travels in
// the payload (not baked into the hook) so one instance can drive edits
// across every plan column without violating the rules of hooks.
export function useUpdatePlanFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      planId: string;
      path: string;
      allowed?: boolean;
      limit?: number | null;
      value?: string;
    }) =>
      plansAdminService.updatePlanFeature(payload.planId, {
        path: payload.path,
        allowed: payload.allowed,
        limit: payload.limit,
        value: payload.value,
      }),

    onMutate: async (payload) => {
      const listKey = plansAdminKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });

      const previous = queryClient.getQueryData<Plan[]>(listKey);
      queryClient.setQueryData<Plan[]>(listKey, (old) =>
        old?.map((p) =>
          p._id === payload.planId ? setFeatureNode(p, payload.path, payload) : p
        )
      );

      return { previous, listKey };
    },

    onError: (_err, _vars, context) => {
      if (context?.listKey) {
        queryClient.setQueryData(context.listKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: plansAdminKeys.list() });
    },
  });
}
