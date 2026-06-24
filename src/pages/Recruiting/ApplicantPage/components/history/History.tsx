import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  CheckCircle2,
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
import {
  applicantsKeys,
  useApplicantsByPhone,
  useDeleteInterview,
} from '../../../../../hooks/queries/useApplicants';
import type { Applicant, Interview } from '../../../../../types/applicants';
import Swal from '../../../../../utils/swal';
import { useLocale } from '../../../../../context/LocaleContext';
import { paths } from '../../../../../router/Paths';
import JobOfferHistory from './JobOfferHistory';
import ContractHistory from './ContractHistory';
import PreviousEntriesHistory from './PreviousEntriesHistory';
import CompletedInterviewsHistory from './CompletedInterviewsHistory';

type Props = {
  applicant: Applicant;
  loading?: boolean;
};

type OfferRow = JobOffer & {
  jobPositionId?: { title?: unknown };
};

type CompletedInterview = Interview & {
  id?: string;
};

type HistorySubTab = 'previous' | 'offers' | 'contracts' | 'interviews';

type TabConfig = {
  key: HistorySubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SUB_TABS: TabConfig[] = [
  { key: 'previous', label: 'Previous Entries', icon: HistoryIcon },
  { key: 'interviews', label: 'Completed Interviews', icon: CheckCircle2 },
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
    if (
      'jobOffer' in dataObj &&
      dataObj.jobOffer &&
      isJobOffer(dataObj.jobOffer)
    ) {
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
  if (
    'jobContract' in obj &&
    obj.jobContract &&
    isJobContract(obj.jobContract)
  ) {
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

const getRowId = (
  row: { _id?: string; id?: string } | null | undefined
): string | null => {
  if (!row) return null;
  return row._id || row.id || null;
};

const getCompanyId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const id = obj._id ?? obj.id;
    return id ? String(id) : '';
  }
  return '';
};

function getApplicantCompanyId(applicantItem: Record<string, unknown>): string {
  const fromDirect = getCompanyId(applicantItem?.companyId);
  if (fromDirect) return fromDirect;
  const jpId = applicantItem?.jobPositionId;
  if (jpId && typeof jpId === 'object') {
    const cId = (jpId as Record<string, unknown>).companyId;
    const resolved = typeof cId === 'string' ? cId : getCompanyId(cId);
    if (resolved) return resolved;
  }
  return '';
}

export default function History({ applicant, loading = false }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLocale();
  const applicantId = String(applicant?._id || '');
  const applicantPhone = useMemo(
    () => applicant?.phone || '',
    [applicant?.phone]
  );
  const applicantCompanyId = useMemo(
    () =>
      getApplicantCompanyId(
        (applicant as unknown as Record<string, unknown>) || {}
      ),
    [applicant]
  );

  const [activeSubTab, setActiveSubTab] = useState<HistorySubTab>('previous');

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedOfferLocal, setSelectedOfferLocal] = useState<JobOffer | null>(
    null
  );
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const offerModalLockRef = useRef<number>(0);

  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null
  );
  const [selectedContractLocal, setSelectedContractLocal] =
    useState<JobContract | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const contractModalLockRef = useRef<number>(0);

  const { data: selectedOfferDetail } = useJobOffer(selectedOfferId || '', {
    enabled: !!selectedOfferId,
  });

  const { data: offers = [], isLoading: isOffersLoading } = useQuery<
    JobOffer[]
  >({
    queryKey: ['jobOffers', 'applicant', applicantId, applicantCompanyId],
    queryFn: () =>
      jobOffersService
        .listOffers({
          applicantId,
          companyId: applicantCompanyId || undefined,
          PageCount: 'all',
        })
        .then((res) => res?.data ?? res),
    enabled: !!applicantId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: contractsResponse, isLoading: isContractsLoading } =
    useQuery<PaginatedJobContracts>({
      queryKey: ['jobContracts', 'applicant', applicantId, applicantCompanyId],
      queryFn: () =>
        jobContractsService.listContracts({
          applicantId,
          companyId: applicantCompanyId || undefined,
          PageCount: 'all',
        }),
      enabled: !!applicantId,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  const jobContracts = useMemo(
    () => contractsResponse?.data ?? [],
    [contractsResponse]
  );

  const { data: selectedContractDetail } = useQuery<JobContract>({
    queryKey: ['jobContracts', 'detail', selectedContractId],
    queryFn: () => jobContractsService.getContract(selectedContractId || ''),
    enabled: !!selectedContractId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: previousApplicants = [], isLoading: isPreviousLoading } =
    useApplicantsByPhone(applicantPhone, {
      enabled: !!applicantPhone,
      companyId: applicantCompanyId || undefined,
    });

  const deleteInterviewMutation = useDeleteInterview();

  const filteredPreviousApplicants = useMemo(() => {
    if (!previousApplicants || !Array.isArray(previousApplicants)) return [];
    const filtered = previousApplicants.filter(
      (applicantItem: Applicant) =>
        !applicantCompanyId ||
        getApplicantCompanyId(
          applicantItem as unknown as Record<string, unknown>
        ) === applicantCompanyId
    );
    const getEntryTimestamp = (item: Applicant): number => {
      const raw =
        (
          item as {
            submittedAt?: string;
            createdAt?: string;
            appliedAt?: string;
          }
        ).submittedAt ||
        (
          item as {
            submittedAt?: string;
            createdAt?: string;
            appliedAt?: string;
          }
        ).createdAt ||
        (
          item as {
            submittedAt?: string;
            createdAt?: string;
            appliedAt?: string;
          }
        ).appliedAt;
      const time = raw ? new Date(raw).getTime() : 0;
      return Number.isNaN(time) ? 0 : time;
    };
    return [...filtered].sort(
      (a, b) => getEntryTimestamp(b) - getEntryTimestamp(a)
    );
  }, [previousApplicants, applicantCompanyId]);

  const filteredOffers = useMemo(() => {
    if (!offers || !Array.isArray(offers)) return [];
    if (!applicantCompanyId) return offers;
    return offers.filter(
      (offer) => getCompanyId(offer?.companyId) === applicantCompanyId
    );
  }, [offers, applicantCompanyId]);

  const filteredContracts = useMemo(() => {
    if (!jobContracts || !Array.isArray(jobContracts)) return [];
    if (!applicantCompanyId) return jobContracts;
    return jobContracts.filter(
      (contract) => getCompanyId(contract?.companyId) === applicantCompanyId
    );
  }, [jobContracts, applicantCompanyId]);

  const completedInterviews = useMemo<CompletedInterview[]>(() => {
    const list = (applicant?.interviews || []) as CompletedInterview[];
    return list.filter(
      (interview) =>
        String(interview?.status || '').toLowerCase() === 'completed'
    );
  }, [applicant?.interviews]);

  const normalizedOfferDetail = useMemo(
    () => extractJobOffer(selectedOfferDetail),
    [selectedOfferDetail]
  );
  const effectiveOffer = normalizedOfferDetail ?? selectedOfferLocal;

  const normalizedContractDetail = useMemo(
    () => extractJobContract(selectedContractDetail),
    [selectedContractDetail]
  );
  const effectiveContract = normalizedContractDetail ?? selectedContractLocal;

  const handlePreviousEntryClick = (applicantId: string) => {
    navigate(paths.applicants.details(applicantId));
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

  const invalidateApplicant = () => {
    if (!applicantId) return;
    queryClient.invalidateQueries({
      queryKey: applicantsKeys.detail(applicantId),
    });
  };

  const handleDeleteInterview = async (interview: CompletedInterview) => {
    const interviewId = String(interview?._id || interview?.id || '');
    if (!applicantId || !interviewId) return;
    const result = await Swal.fire({
      title: t('deleteInterviewTitle', 'applicants'),
      text: t('actionCannotBeUndone', 'common'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('delete', 'common'),
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: '#dc2626',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteInterviewMutation.mutateAsync({ applicantId, interviewId });
      invalidateApplicant();
    } catch (error) {
      void error;
    }
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
            offers={filteredOffers as OfferRow[]}
            onSelectOffer={handleOfferSelect}
          />
        );
      case 'contracts':
        return (
          <ContractHistory
            isLoading={isContractsLoading}
            contracts={filteredContracts}
            onSelectContract={handleContractSelect}
          />
        );
      case 'interviews':
        return (
          <CompletedInterviewsHistory
            isLoading={false}
            interviews={completedInterviews}
            applicantId={applicantId}
            onDelete={handleDeleteInterview}
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

      <div className="flex border-b border-gray-200 md:overflow-x-auto xl:overflow-x-visible px-5">
        {SUB_TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeSubTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSubTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon
                className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
              />
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
