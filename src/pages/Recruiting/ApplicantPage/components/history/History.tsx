import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase,
  FileSignature,
  History as HistoryIcon,
} from 'lucide-react';
import JobOfferPreview from '../../../../../components/modals/JobOfferPreview/JobOfferPreview';
import ContractPreview from '../../../../../components/modals/ContractPreview/ContractPreview';
import {
  jobOffersService,
  type JobOffer,
} from '../../../../../services/jobOffersService';
import {
  jobContractsService,
  type JobContract,
  type PaginatedJobContracts,
} from '../../../../../services/jobContractsService';
import { useJobOffer } from '../../../../../hooks/queries/useJobOffers';
import { useApplicantsByPhone } from '../../../../../hooks/queries/useApplicants';
import type { Applicant } from '../../../../../types/applicants';
import JobOfferHistory from './JobOfferHistory';
import ContractHistory from './ContractHistory';
import PreviousEntriesHistory from './PreviousEntriesHistory';

type Props = {
  applicant: Applicant;
  loading?: boolean;
};

type OfferRow = JobOffer & {
  jobPositionId?: { title?: unknown };
};

type HistorySubTab = 'previous' | 'offers' | 'contracts';

type TabConfig = {
  key: HistorySubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SUB_TABS: TabConfig[] = [
  { key: 'previous', label: 'Previous Entries', icon: HistoryIcon },
  { key: 'offers', label: 'Job Offers', icon: Briefcase },
  { key: 'contracts', label: 'Job Contracts', icon: FileSignature },
];

function isJobOffer(obj: unknown): obj is JobOffer {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    '_id' in candidate &&
    'companyId' in candidate &&
    'isTemplate' in candidate &&
    'position' in candidate
  );
}

function isJobContract(obj: unknown): obj is JobContract {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    '_id' in candidate &&
    'companyId' in candidate &&
    'applicantId' in candidate &&
    'jobOfferId' in candidate
  );
}

function extractJobOffer(data: unknown): JobOffer | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if ('jobOffer' in obj && obj.jobOffer && isJobOffer(obj.jobOffer)) {
    return obj.jobOffer;
  }
  if ('data' in obj && obj.data && typeof obj.data === 'object') {
    const dataObj = obj.data as Record<string, unknown>;
    if ('jobOffer' in dataObj && dataObj.jobOffer && isJobOffer(dataObj.jobOffer)) {
      return dataObj.jobOffer;
    }
    if (isJobOffer(dataObj)) return dataObj;
  }
  if (isJobOffer(obj)) return obj;
  return null;
}

function extractJobContract(data: unknown): JobContract | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if ('jobContract' in obj && obj.jobContract && isJobContract(obj.jobContract)) {
    return obj.jobContract;
  }
  if ('data' in obj && obj.data && typeof obj.data === 'object') {
    const dataObj = obj.data as Record<string, unknown>;
    if (
      'jobContract' in dataObj &&
      dataObj.jobContract &&
      isJobContract(dataObj.jobContract)
    ) {
      return dataObj.jobContract;
    }
    if (isJobContract(dataObj)) return dataObj;
  }
  if (isJobContract(obj)) return obj;
  return null;
}

const getRowId = (row: { _id?: string; id?: string } | null | undefined): string | null => {
  if (!row) return null;
  return row._id || row.id || null;
};

export default function History({ applicant, loading = false }: Props) {
  const navigate = useNavigate();
  const applicantId = String(applicant?._id || '');
  const applicantPhone = useMemo(() => applicant?.phone || '', [applicant?.phone]);

  const [activeSubTab, setActiveSubTab] = useState<HistorySubTab>('previous');

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedOfferLocal, setSelectedOfferLocal] = useState<JobOffer | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const offerModalLockRef = useRef<number>(0);

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedContractLocal, setSelectedContractLocal] = useState<JobContract | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const contractModalLockRef = useRef<number>(0);

  const { data: selectedOfferDetail } = useJobOffer(selectedOfferId || '', {
    enabled: !!selectedOfferId,
  });

  const { data: offers = [], isLoading: isOffersLoading } = useQuery<JobOffer[]>({
    queryKey: ['jobOffers', 'applicant', applicantId],
    queryFn: () =>
      jobOffersService.listOffers({ applicantId, PageCount: 'all' }),
    enabled: !!applicantId,
  });

  const { data: contractsResponse, isLoading: isContractsLoading } = useQuery<PaginatedJobContracts>({
    queryKey: ['jobContracts', 'applicant', applicantId],
    queryFn: () =>
      jobContractsService.listContracts({ applicantId, PageCount: 'all' }),
    enabled: !!applicantId,
  });

  const jobContracts = contractsResponse?.data ?? [];

  const { data: selectedContractDetail } = useQuery<JobContract>({
    queryKey: ['jobContracts', 'detail', selectedContractId],
    queryFn: () => jobContractsService.getContract(selectedContractId || ''),
    enabled: !!selectedContractId,
  });

  const { data: previousApplicants = [], isLoading: isPreviousLoading } = useApplicantsByPhone(applicantPhone, {
    enabled: !!applicantPhone,
  });

  const filteredPreviousApplicants = useMemo(() => {
    if (!previousApplicants || !Array.isArray(previousApplicants)) return [];
    const currentId = String(applicant?._id || '');
    return previousApplicants.filter(
      (applicantItem: Applicant) => String(applicantItem?._id || '') !== currentId,
    );
  }, [previousApplicants, applicant?._id]);

  const normalizedOfferDetail = useMemo(() => extractJobOffer(selectedOfferDetail), [selectedOfferDetail]);
  const effectiveOffer = normalizedOfferDetail ?? selectedOfferLocal;

  const normalizedContractDetail = useMemo(
    () => extractJobContract(selectedContractDetail),
    [selectedContractDetail],
  );
  const effectiveContract = normalizedContractDetail ?? selectedContractLocal;

  const handlePreviousEntryClick = (applicantId: string) => {
    navigate(`/applicant-details/${applicantId}`);
  };

  const handleOfferSelect = (offer: JobOffer) => {
    const offerId = getRowId(offer);
    setSelectedOfferId(offerId);
    setSelectedOfferLocal(offer);
    offerModalLockRef.current = Date.now() + 800;
    setIsOfferModalOpen(true);
  };

  const handleContractSelect = (contract: JobContract) => {
    const contractId = getRowId(contract);
    setSelectedContractId(contractId);
    setSelectedContractLocal(contract);
    contractModalLockRef.current = Date.now() + 800;
    setIsContractModalOpen(true);
  };

  const renderSubTabContent = () => {
    if (loading) {
      return <div className="h-48 rounded-lg bg-gray-100 animate-pulse" />;
    }

    switch (activeSubTab) {
      case 'previous':
        return (
          <PreviousEntriesHistory
            isLoading={isPreviousLoading}
            applicants={filteredPreviousApplicants}
            onSelectApplicant={handlePreviousEntryClick}
          />
        );
      case 'offers':
        return (
          <JobOfferHistory
            isLoading={isOffersLoading}
            offers={offers as OfferRow[]}
            onSelectOffer={handleOfferSelect}
          />
        );
      case 'contracts':
        return (
          <ContractHistory
            isLoading={isContractsLoading}
            contracts={jobContracts}
            onSelectContract={handleContractSelect}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-800">History</h3>
        <p className="text-sm text-gray-400 mt-0.5">
          Previous entries, job offers, and contracts linked to this applicant
        </p>
      </div>

      <div className="flex border-b border-gray-200 px-5">
        {SUB_TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeSubTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSubTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-5">{renderSubTabContent()}</div>

      <JobOfferPreview
        isOpen={isOfferModalOpen}
        onClose={() => {
          if (Date.now() < offerModalLockRef.current) return;
          setIsOfferModalOpen(false);
          setSelectedOfferId(null);
          setSelectedOfferLocal(null);
        }}
        offer={effectiveOffer}
      />
      <ContractPreview
        isOpen={isContractModalOpen}
        onClose={() => {
          if (Date.now() < contractModalLockRef.current) return;
          setIsContractModalOpen(false);
          setSelectedContractId(null);
          setSelectedContractLocal(null);
        }}
        contract={effectiveContract}
      />
    </div>
  );
}
