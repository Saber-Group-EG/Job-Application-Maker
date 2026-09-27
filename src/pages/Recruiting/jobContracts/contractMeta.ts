import type { BadgeTone } from '../../../components/ui/kit';
import type { ContractStatus } from '../../../services/contractsService';

export const CONTRACT_STATUSES: ContractStatus[] = ['draft', 'sent', 'signed', 'rejected', 'expired'];

export const CONTRACT_STATUS_TONE: Record<ContractStatus, BadgeTone> = {
  draft: 'slate',
  sent: 'blue',
  signed: 'green',
  rejected: 'red',
  expired: 'amber',
};

export const CONTRACT_TYPE_TONE: Record<string, BadgeTone> = {
  permanent: 'green',
  'fixed-term': 'blue',
  freelance: 'amber',
  probation: 'slate',
};

export const contractStatusKey = (status: string) => `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;

export const contractTypeKey = (type?: string) => (type === 'fixed-term' ? 'fixedTerm' : type || '');
