import type { BadgeTone } from '../../../components/ui/kit';
import type { OfferStatus } from '../../../services/jobOffersService';

export const OFFER_STATUSES: OfferStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

export const OFFER_STATUS_TONE: Record<OfferStatus, BadgeTone> = {
  draft: 'slate',
  sent: 'blue',
  accepted: 'green',
  rejected: 'red',
  expired: 'amber',
};

export const WORK_TYPE_TONE: Record<string, BadgeTone> = {
  'full-time': 'green',
  'part-time': 'blue',
  contract: 'amber',
  internship: 'slate',
};

export const offerStatusKey = (status: string) => `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;

export const workTypeKey = (workType?: string) =>
  workType === 'full-time' ? 'fullTime' : workType === 'part-time' ? 'partTime' : workType || '';
