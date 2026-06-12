import type { JobOffer } from '../services/jobOffersService';
import type { CreateJobContractPayload } from '../services/contractsService';

// Best-guess workType → contractType mapping
const WORK_TYPE_TO_CONTRACT_TYPE: Record<
  string,
  CreateJobContractPayload['contractType']
> = {
  'full-time': 'permanent',
  'part-time': 'fixed-term',
  contract: 'fixed-term',
  internship: 'probation',
};

export function offerToContractDefaults(
  offer: JobOffer
): Partial<CreateJobContractPayload> {
  const companyId =
    typeof offer.companyId === 'object' && offer.companyId !== null
      ? offer.companyId._id
      : String(offer.companyId);

  const applicantId =
    typeof offer.applicantId === 'object' && offer.applicantId !== null
      ? offer.applicantId._id
      : (offer.applicantId ?? null);

  const jobPositionId =
    typeof offer.applicantId === 'object' &&
    offer.applicantId !== null &&
    offer.applicantId.jobPositionId
      ? offer.applicantId.jobPositionId._id
      : null;

  return {
    companyId,
    ...(applicantId ? { applicantId } : {}),
    ...(jobPositionId ? { jobPositionId } : {}),
    offerId: offer._id,
    contractType: WORK_TYPE_TO_CONTRACT_TYPE[offer.workType] ?? 'permanent',
    position: offer.position,
    // Default to today — user reviews before saving
    startDate: new Date().toISOString().slice(0, 10),
    salary: {
      basic: offer.salary.basic ?? undefined,
      currency: offer.salary.currency ?? 'EGP',
    },
    // Sections carry over directly — same bilingual shape
    sections: offer.sections.map((s, idx) => ({
      title: s.title,
      items: s.items.map(({ en, ar }) => ({ en, ar })),
      displayOrder: idx,
    })),
    notes: offer.notes ?? undefined,
  };
}
