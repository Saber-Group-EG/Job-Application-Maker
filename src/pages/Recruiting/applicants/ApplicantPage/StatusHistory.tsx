import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ComponentCard from '../../../../components/common/ComponentCard';
import { useAuth } from '../../../../context/AuthContext';
import { useApplicantsByPhone } from '../../../../hooks/queries/useApplicants';
import { jobOffersService, type JobOffer, type PaginatedJobOffers } from '../../../../services/jobOffersService';
import { jobContractsService, type JobContract, type PaginatedJobContracts } from '../../../../services/jobContractsService';
import { useJobOffer } from '../../../../hooks/queries/useJobOffers';
import JobOfferPreview from '../../../../components/modals/JobOfferPreview/JobOfferPreview';
import ContractPreview from '../../../../components/modals/ContractPreview/ContractPreview';
import StatusHistoryAllTab from './StatusHistoryTabs/StatusHistoryAllTab';
import StatusHistoryStatusTab from './StatusHistoryTabs/StatusHistoryStatusTab';
import StatusHistoryActionsTab from './StatusHistoryTabs/StatusHistoryActionsTab';
import StatusHistoryInterviewTab from './StatusHistoryTabs/StatusHistoryInterviewTab';
import StatusHistoryPreviousTab from './StatusHistoryTabs/StatusHistoryPreviousTab';
import StatusHistoryOffersTab from './StatusHistoryTabs/StatusHistoryOffersTab';
import StatusHistoryContractsTab from './StatusHistoryTabs/StatusHistoryContractsTab';
import type { Applicant } from '../../../../types/applicants';

type Props = {
  applicant: Applicant;
  loading?: boolean;
};

type ActivityTab = 'all' | 'status' | 'actions' | 'interview' | 'previous' | 'offers' | 'contracts';

// Type guard to check if an object is a JobOffer
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

// Type guard to check if an object is a JobContract
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

// Helper function to safely extract nested data
function extractJobOffer(data: unknown): JobOffer | null {
  if (!data || typeof data !== 'object') return null;
  
  const obj = data as Record<string, unknown>;
  
  // Try different possible response structures
  if ('jobOffer' in obj && obj.jobOffer && isJobOffer(obj.jobOffer)) {
    return obj.jobOffer;
  }
  if ('data' in obj && obj.data && typeof obj.data === 'object') {
    const dataObj = obj.data as Record<string, unknown>;
    if ('jobOffer' in dataObj && dataObj.jobOffer && isJobOffer(dataObj.jobOffer)) {
      return dataObj.jobOffer;
    }
    if (isJobOffer(dataObj)) {
      return dataObj;
    }
  }
  if (isJobOffer(obj)) {
    return obj;
  }
  
  return null;
}

function extractJobContract(data: unknown): JobContract | null {
  if (!data || typeof data !== 'object') return null;
  
  const obj = data as Record<string, unknown>;
  
  // Try different possible response structures
  if ('jobContract' in obj && obj.jobContract && isJobContract(obj.jobContract)) {
    return obj.jobContract;
  }
  if ('data' in obj && obj.data && typeof obj.data === 'object') {
    const dataObj = obj.data as Record<string, unknown>;
    if ('jobContract' in dataObj && dataObj.jobContract && isJobContract(dataObj.jobContract)) {
      return dataObj.jobContract;
    }
    if (isJobContract(dataObj)) {
      return dataObj;
    }
  }
  if (isJobContract(obj)) {
    return obj;
  }
  
  return null;
}

export default function StatusHistory({ applicant, loading = false }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedOfferLocal, setSelectedOfferLocal] = useState<JobOffer | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const modalLockRef = useRef<number>(0);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedContractLocal, setSelectedContractLocal] = useState<JobContract | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const contractModalLockRef = useRef<number>(0);
  
  const { data: selectedOfferDetail } = useJobOffer(selectedOfferId || '', {
    enabled: !!selectedOfferId,
  });

  const applicantId = String(applicant?._id || '');
  
  const { data: offersResponse, isLoading: isOffersLoading } = useQuery<PaginatedJobOffers>({
    queryKey: ['jobOffers', 'applicant', applicantId],
    queryFn: () =>
      jobOffersService.listOffers({ applicantId, PageCount: 'all' }),
    enabled: !!applicantId && activityTab === 'offers',
  });
  
  const jobOffers = offersResponse?.data ?? [];

  const { data: contractsResponse, isLoading: isContractsLoading } = useQuery<PaginatedJobContracts>({
    queryKey: ['jobContracts', 'applicant', applicantId],
    queryFn: () =>
      jobContractsService.listContracts({ applicantId, PageCount: 'all' }),
    enabled: !!applicantId && activityTab === 'contracts',
  });

  const jobContracts = contractsResponse?.data ?? [];

  const { data: selectedContractDetail } = useQuery<JobContract>({
    queryKey: ['jobContracts', 'detail', selectedContractId],
    queryFn: () => jobContractsService.getContract(selectedContractId || ''),
    enabled: !!selectedContractId,
  });

  const normalizedDetail = useMemo(() => extractJobOffer(selectedOfferDetail), [selectedOfferDetail]);
  const effectiveOffer = normalizedDetail ?? selectedOfferLocal;
  
  const safeOffer = effectiveOffer;

  const normalizedContractDetail = useMemo(() => extractJobContract(selectedContractDetail), [selectedContractDetail]);
  const effectiveContract = normalizedContractDetail ?? selectedContractLocal;

  const applicantPhone = useMemo(() => applicant?.phone || '', [applicant?.phone]);
  
  const { data: previousApplicants = [], isLoading: isPreviousLoading } = useApplicantsByPhone(applicantPhone, {
    enabled: !!applicantPhone && activityTab === 'previous',
  });

  const filteredPreviousApplicants = useMemo(() => {
    if (!previousApplicants || !Array.isArray(previousApplicants)) return [];
    const currentId = String(applicant?._id || '');
    return previousApplicants.filter((applicantItem: Applicant) => String(applicantItem?._id || '') !== currentId);
  }, [previousApplicants, applicant?._id]);

  const handlePreviousEntryClick = (applicantId: string) => {
    navigate(`/applicant-details/${applicantId}`);
  };

  const getRowId = (row: { _id?: string; id?: string } | null | undefined): string | null => {
    if (!row) return null;
    return row._id || row.id || null;
  };

  const handleOfferSelect = (offer: JobOffer) => {
    const offerId = getRowId(offer);
    setSelectedOfferId(offerId);
    setSelectedOfferLocal(offer);
    modalLockRef.current = Date.now() + 800;
    setIsOfferModalOpen(true);
  };

  const handleContractSelect = (contract: JobContract) => {
    const contractId = getRowId(contract);
    setSelectedContractId(contractId);
    setSelectedContractLocal(contract);
    contractModalLockRef.current = Date.now() + 800;
    setIsContractModalOpen(true);
  };

  const activityProps = {
    applicant,
    user,
    expandedHistory,
    setExpandedHistory,
  };

  const renderTabContent = () => {
    switch (activityTab) {
      case 'previous':
        return (
          <StatusHistoryPreviousTab
            isLoading={isPreviousLoading}
            applicants={filteredPreviousApplicants}
            onSelectApplicant={handlePreviousEntryClick}
          />
        );
      case 'offers':
        return (
          <StatusHistoryOffersTab
            isLoading={isOffersLoading}
            offers={jobOffers}
            onSelectOffer={handleOfferSelect}
          />
        );
      case 'contracts':
        return (
          <StatusHistoryContractsTab
            isLoading={isContractsLoading}
            contracts={jobContracts}
            onSelectContract={handleContractSelect}
          />
        );
      case 'status':
        return <StatusHistoryStatusTab {...activityProps} />;
      case 'actions':
        return <StatusHistoryActionsTab {...activityProps} />;
      case 'interview':
        return <StatusHistoryInterviewTab {...activityProps} />;
      case 'all':
      default:
        return <StatusHistoryAllTab {...activityProps} />;
    }
  };

  return (
    <div>
      <ComponentCard
        title="Activity Timeline"
        desc="Track all activities, status changes, messages, and comments"
      >
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActivityTab('all')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                activityTab === 'all'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActivityTab('status')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                activityTab === 'status'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => setActivityTab('actions')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                activityTab === 'actions'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Actions
            </button>
            <button
              onClick={() => setActivityTab('interview')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                activityTab === 'interview'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Interview
            </button>
            <button
              onClick={() => setActivityTab('previous')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                activityTab === 'previous'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Previous Entries
            </button>
            <button
              onClick={() => setActivityTab('offers')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                activityTab === 'offers'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Job Offer History
            </button>
            <button
              onClick={() => setActivityTab('contracts')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                activityTab === 'contracts'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Job Contract History
            </button>
          </nav>
        </div>

        <div className="w-full">
          {loading ? (
            <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Summary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Channels</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </ComponentCard>
      <JobOfferPreview
        isOpen={isOfferModalOpen}
        onClose={() => {
          if (Date.now() < modalLockRef.current) return;
          setIsOfferModalOpen(false);
          setSelectedOfferId(null);
          setSelectedOfferLocal(null);
        }}
        offer={safeOffer}
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