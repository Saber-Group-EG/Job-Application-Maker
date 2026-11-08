// The job form's removals with Undo (see src/hooks/useRemoveWithUndo).
import { useRemoveWithUndo as useGenericRemoveWithUndo } from '../../../../hooks/useRemoveWithUndo';
import type { JobForm, SetJobForm } from './types';

export const useRemoveWithUndo = (setForm: SetJobForm) => useGenericRemoveWithUndo<JobForm>(setForm);
