import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '../../../router/Paths';
import type { JobOfferEditorProps } from '../../../components/modals/JobOffersModal/JobOffersModal';
import type { JobContractEditorProps } from '../../../components/modals/ContractModal/ContractModal';

export type OfferEditorState = Omit<JobOfferEditorProps, 'onClose'>;
export type ContractEditorState = Omit<JobContractEditorProps, 'onClose'>;

// The editors are routes, so what they are given travels in history state.
// The JSON round-trip keeps it structured-cloneable (table rows can carry
// functions or class instances) and survives a page refresh.
const plain = <T,>(state: T): T => JSON.parse(JSON.stringify(state));

export function useOpenOfferEditor() {
  const navigate = useNavigate();
  return useCallback(
    (state: OfferEditorState) =>
      navigate(paths.jobs.offerEditor, { state: plain(state) }),
    [navigate]
  );
}

export function useOpenContractEditor() {
  const navigate = useNavigate();
  return useCallback(
    (state: ContractEditorState) =>
      navigate(paths.jobs.contractEditor, { state: plain(state) }),
    [navigate]
  );
}
