import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import PersonalInfo from './components/ApplicantData/PersonalInfo';
import ActivityFeed from './components/ActivityFeed';
import CustomResponses from './components/ApplicantData/CustomResponses';
import JobSpec from './components/ApplicantData/JobSpec';
import InterviewQuestions from './components/InterviewData/InterviewQuestions';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Swal from '../../../utils/swal';
import {
  useApplicant,
  useUpdateApplicant,
  useUpdateApplicantStatus,
  useAddComment,
  useDeleteApplicant,
} from '../../../hooks/queries';
import {
  toPlainString,
} from '../../../utils/strings';
import type {
  Applicant,
  ResponseSection,
  Comment,
  StatusHistory,
  Message,
  Interview,
  ActivityItem,
  ActivityLike,
  JobSpecLike,
  JobSpecResponseLike,
  JobSpecItem,
  Activity,
  Question,
  LeafQuestion,
} from '../../../types/applicants';
import { paths } from '../../../router/Paths';

const resolveActorName = (actor: unknown): string => {
  if (actor === null || actor === undefined) return 'System';
  if (typeof actor === 'string') return actor || 'System';
  if (typeof actor === 'object') {
    const obj = actor as { fullName?: string; name?: string; email?: string; firstName?: string; lastName?: string };
    if (obj.fullName) return String(obj.fullName);
    if (obj.name) return String(obj.name);
    if (obj.email) return String(obj.email);
    if (obj.firstName || obj.lastName) return `${obj.firstName ?? ''} ${obj.lastName ?? ''}`.trim() || 'System';
  }
  return 'System';
};

const toActivity = (entry: ActivityLike | null | undefined): ActivityItem | null => {
  if (!entry) return null;
  const id = String(
    entry._id ||
      entry.id ||
      `${entry.changedAt || entry.sentAt || entry.scheduledAt || ''}_${Math.random()}`
  );
  const timestamp = String(
    entry.changedAt ||
      entry.sentAt ||
      entry.scheduledAt ||
      entry.createdAt ||
      new Date().toISOString()
  );
  const userName = resolveActorName(
    entry.changedBy ?? entry.sentBy ?? entry.issuedBy ?? entry.author
  );
  return { id, timestamp, user: { name: userName } } as ActivityItem;
};

const buildActivities = (applicant: Applicant | null | undefined): ActivityItem[] => {
  if (!applicant) return [];

  const items: ActivityItem[] = [];

  (applicant.statusHistory || []).forEach((entry: StatusHistory) => {
    const base = toActivity(entry);
    if (!base) return;
    items.push({
      ...base,
      type: 'status_change',
      title: 'Application status changed',
      status: entry.status,
    });
  });

  (applicant.comments || []).forEach((entry: Comment) => {
    const base = toActivity(entry);
    if (!base) return;
    const text = entry.comment || entry.text || '';
    items.push({
      ...base,
      type: 'comment',
      title: 'Comment added',
      comment: text,
    });
  });

  (applicant.messages || []).forEach((entry: Message) => {
    const base = toActivity(entry);
    if (!base) return;
    items.push({
      ...base,
      type: 'message',
      title: `${(entry.type || 'internal').toUpperCase()} message`,
      messageChannel: entry.type,
      description: entry.content ?? entry.subject,
    });
  });

  (applicant.interviews || []).forEach((entry: Interview) => {
    const base = toActivity(entry as unknown as ActivityLike);
    if (!base) return;
    const status = (entry as { status?: string }).status || 'scheduled';
    items.push({
      ...base,
      type: 'interview',
      title: `Interview ${status}`,
      interviewStatus: status,
      description: entry.notes,
    });
  });

  items.push({
    id: `app_${applicant._id}`,
    type: 'application',
    title: 'Application submitted',
    timestamp: applicant.submittedAt || applicant.createdAt || new Date().toISOString(),
    user: { name: applicant.fullName || 'Applicant' },
  });

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
};

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return toPlainString(value);
  }
};

const humanizeKey = (key: string): string =>
  String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const isStructuredAnswer = (value: unknown): value is { type?: string; answer?: unknown; value?: unknown } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.type !== 'string') return false;
  return 'answer' in obj || 'value' in obj;
};

const isGroupLikeArray = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => item && typeof item === 'object' && !Array.isArray(item));

const inferQuestionType = (key: string, value: unknown): string => {
  if (isStructuredAnswer(value)) {
    const t = (value as { type?: string }).type;
    if (t) return t;
  }
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'checkbox';
  if (Array.isArray(value)) return 'tags';

  const lower = key.toLowerCase();
  if (/(_at$|^.*_date$|date$|dob$|birth)/.test(lower)) return 'date';
  if (lower.includes('email')) return 'email';
  if (lower.includes('url') || lower.includes('link') || lower.includes('website')) return 'url';
  if (
    lower.includes('salary') ||
    lower.includes('number') ||
    lower.includes('count') ||
    lower.includes('amount') ||
    lower.includes('score')
  )
    return 'number';
  if (
    lower.includes('description') ||
    lower.includes('notes') ||
    lower.includes('responsibilit') ||
    lower.includes('reason') ||
    lower.includes('address')
  )
    return 'textarea';
  return 'text';
};

const extractAnswer = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isStructuredAnswer(value)) {
    const a = (value as { answer?: unknown; value?: unknown }).answer;
    if (a !== undefined) return stringifyValue(a);
    const v = (value as { value?: unknown }).value;
    if (v !== undefined) return stringifyValue(v);
  }
  return stringifyValue(value);
};

const buildLeafQuestion = (id: string, key: string, value: unknown): LeafQuestion => {
  const type = inferQuestionType(key, value);
  const text = humanizeKey(key);
  const answer = extractAnswer(value);

  switch (type) {
    case 'textarea':
      return { id, type: 'textarea', text, value: answer, rows: 3 };
    case 'email':
      return { id, type: 'email', text, value: answer };
    case 'date':
      return { id, type: 'date', text, value: answer };
    case 'url':
      return { id, type: 'url', text, value: answer };
    case 'number': {
      const num = Number(answer);
      return { id, type: 'number', text, value: Number.isFinite(num) ? num : 0 };
    }
    case 'checkbox':
      return { id, type: 'checkbox', text, checked: answer === 'true' || answer === '1' };
    case 'radio':
      return { id, type: 'radio', text, options: [], selectedValue: answer };
    case 'dropdown':
      return { id, type: 'dropdown', text, options: [], selectedValue: answer };
    case 'tags': {
      const values = Array.isArray(value)
        ? value.map((v) => String(v)).filter(Boolean)
        : answer
          ? answer.split(',').map((v) => v.trim()).filter(Boolean)
          : [];
      return { id, type: 'tags', text, values };
    }
    case 'text':
    default:
      return { id, type: 'text', text, value: answer };
  }
};

const buildCustomResponseSections = (applicant: Applicant | null | undefined): ResponseSection[] => {
  if (!applicant) return [];

  const raw: Record<string, unknown> =
    (applicant.customResponses && typeof applicant.customResponses === 'object'
      ? (applicant.customResponses as Record<string, unknown>)
      : {}) || {};

  const questions: Question[] = [];

  Object.entries(raw).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && !value.trim()) return;
    if (Array.isArray(value) && value.length === 0) return;

    if (isGroupLikeArray(value)) {
      value.forEach((item, index) => {
        const groupId = `${key}_${index}`;
        const subEntries = Object.entries(item).filter(([, v]) => {
          if (v === null || v === undefined) return false;
          if (typeof v === 'string' && !v.trim()) return false;
          if (Array.isArray(v) && v.length === 0) return false;
          return true;
        });
        if (subEntries.length === 0) return;
        const subQuestions: LeafQuestion[] = subEntries.map(([subKey, subValue]) =>
          buildLeafQuestion(`${groupId}_${subKey}`, subKey, subValue)
        );
        questions.push({
          id: groupId,
          type: 'group',
          text: `Entry ${index + 1}`,
          groupId,
          groupName: `${humanizeKey(key)} #${index + 1}`,
          questions: subQuestions,
        });
      });
      return;
    }

    questions.push(buildLeafQuestion(key, key, value));
  });

  if (questions.length === 0) return [];

  return [
    {
      id: 'applicant_responses',
      title: 'Application Responses',
      description: 'Custom field responses submitted with the application',
      questions,
    },
  ];
};

const buildJobSpecItems = (applicant: Applicant | null | undefined): JobSpecItem[] => {
  if (!applicant) return [];

  const applicantLike = applicant as unknown as {
    jobPositionId?: JobSpecLike | string;
    jobPosition?: JobSpecLike;
    jobSpecsResponses?: JobSpecResponseLike[];
    jobSpecsWithDetails?: JobSpecLike[];
  };

  const populatedJobPos: JobSpecLike | undefined =
    typeof applicantLike.jobPositionId === 'object'
      ? applicantLike.jobPositionId
      : applicantLike.jobPosition;

  const availableSpecs: JobSpecLike[] = Array.isArray(applicantLike.jobSpecsWithDetails) && applicantLike.jobSpecsWithDetails.length > 0
    ? applicantLike.jobSpecsWithDetails
    : Array.isArray(
        (populatedJobPos as { jobSpecsWithDetails?: JobSpecLike[] } | undefined)?.jobSpecsWithDetails
      )
      ? (populatedJobPos as { jobSpecsWithDetails: JobSpecLike[] }).jobSpecsWithDetails
      : Array.isArray((populatedJobPos as { jobSpecs?: JobSpecLike[] } | undefined)?.jobSpecs)
        ? (populatedJobPos as { jobSpecs: JobSpecLike[] }).jobSpecs
        : [];

  const answerMap = new Map<string, boolean>();
  if (Array.isArray(applicantLike.jobSpecsResponses)) {
    applicantLike.jobSpecsResponses.forEach((r) => {
      const specId = String(r?.jobSpecId || r?._id || r?.id || '').trim();
      if (specId) answerMap.set(specId, Boolean(r?.answer));
    });
  }

  return availableSpecs.map((s, index) => {
    const specId = String(s?.jobSpecId || s?._id || s?.id || `spec_${index}`);
    return {
      _id: String(s?._id || `${specId}_${index}`),
      id: specId,
      jobSpecId: specId,
      answer: answerMap.has(specId) ? answerMap.get(specId)! : Boolean(s?.answer),
      spec: {
        en: toPlainString(
          (typeof s?.spec === 'object' && s?.spec !== null ? s.spec.en : s?.spec) ??
            s?.title ??
            s?.label ??
            s?.name ??
            'Specification'
        ),
      },
      weight: Number(s?.weight ?? 0),
    };
  });
};

const ApplicantDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: applicant, isLoading, isError, error, refetch } = useApplicant(id || '');
  const updateApplicant = useUpdateApplicant();
  const updateStatus = useUpdateApplicantStatus();
  const addComment = useAddComment();
  const deleteApplicant = useDeleteApplicant();

  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'interview'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editedApplicant, setEditedApplicant] = useState<Partial<Applicant> | null>(null);
  const [editedSections, setEditedSections] = useState<ResponseSection[]>([]);

  useEffect(() => {
    if (applicant) {
      setEditedApplicant({
        fullName: applicant.fullName,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        email: applicant.email,
        phone: applicant.phone,
        address: applicant.address,
      });
      setEditedSections(buildCustomResponseSections(applicant));
    }
  }, [applicant]);

  const activities = useMemo<Activity[]>(() => buildActivities(applicant), [applicant]);
  const sections = useMemo<ResponseSection[]>(
    () => (isEditing ? editedSections : buildCustomResponseSections(applicant)),
    [isEditing, editedSections, applicant]
  );
  const jobSpecItems = useMemo<JobSpecItem[]>(() => buildJobSpecItems(applicant), [applicant]);

  const handleAddComment = async () => {
    if (!comment.trim() || !id) return;
    try {
      await addComment.mutateAsync({ id, data: { comment: comment.trim() } });
      setComment('');
    } catch {
      // mutation already shows toast
    }
  };

  const handleEdit = () => {
    if (isEditing && id && applicant) {
      handleSave();
      return;
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!id || !applicant) return;
    try {
      const payload: Record<string, unknown> = {
        fullName: editedApplicant?.fullName ?? applicant.fullName,
        firstName: editedApplicant?.firstName ?? applicant.firstName,
        lastName: editedApplicant?.lastName ?? applicant.lastName,
        email: editedApplicant?.email ?? applicant.email,
        phone: editedApplicant?.phone ?? applicant.phone,
        address: editedApplicant?.address ?? applicant.address,
      };
      if (Object.keys(editedApplicant || {}).length > 0) {
        Object.assign(payload, editedApplicant);
      }
      const customResponses: Record<string, unknown> = {};
      editedSections.forEach((section) => {
        section.questions.forEach((q) => {
          if (q?.id) customResponses[q.id] = (q as { value?: unknown }).value ?? '';
        });
      });
      if (Object.keys(customResponses).length > 0) {
        payload.customResponses = customResponses;
      }
      await updateApplicant.mutateAsync({ id, data: payload as Parameters<typeof updateApplicant.mutateAsync>[0]['data'] });
      setIsEditing(false);
    } catch {
      // toast handled by mutation
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (applicant) {
      setEditedApplicant({
        fullName: applicant.fullName,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        email: applicant.email,
        phone: applicant.phone,
        address: applicant.address,
      });
      setEditedSections(buildCustomResponseSections(applicant));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const result = await Swal.fire({
      title: 'Delete applicant?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteApplicant.mutateAsync(id);
      navigate(paths.applicants.root);
    } catch {
      // toast handled by mutation
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !applicant || applicant.status === newStatus) return;
    try {
      await updateStatus.mutateAsync({ id, data: { status: newStatus } });
    } catch {
      // toast handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !applicant) {
    return (
      <div className="bg-gray-50 min-h-screen p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Applicant not found</h2>
          <p className="text-sm text-gray-500 mb-4">
            {(error as { message?: string } | null | undefined)?.message || 'We could not load this applicant.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate(paths.applicants.root)}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
            >
              Back to list
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-8xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Applicants</span>
            <span>-›</span>
            <span className="text-gray-800">{applicant.fullName || 'Applicant Details'}</span>
          </div>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {applicant.fullName || 'Applicant Details'}
            </h1>
            <div className="flex gap-3">
              <button
                onClick={handleEdit}
                disabled={updateApplicant.isPending}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isEditing ? (updateApplicant.isPending ? 'Saving...' : 'Save') : 'Edit'}
              </button>
              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleteApplicant.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteApplicant.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('interview')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'interview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Interview Questions
          </button>
        </div>

        {activeTab === 'details' ? (
          <>
            <div className="flex flex-col lg:flex-row gap-6 mb-6">
              <div className="lg:w-80 flex-shrink-0">
                <PersonalInfo
                  applicant={applicant}
                  isEditing={isEditing}
                  editedApplicant={editedApplicant}
                  onChange={setEditedApplicant}
                  onStatusChange={handleStatusChange}
                />
              </div>
              <div className="flex-1 space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Comment</h3>
                  <div className="flex gap-3">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
                      rows={3}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={addComment.isPending || !comment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap h-fit disabled:opacity-50"
                    >
                      {addComment.isPending ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <JobSpec specs={jobSpecItems} />
                </div>
              </div>
            </div>
            <div className="mb-6">
              <CustomResponses
                isEditable={isEditing}
                sections={sections}
                onSectionsChange={setEditedSections}
              />
            </div>
            <div className="w-full">
              <ActivityFeed activities={activities} />
            </div>
          </>
        ) : (
          <div className="mb-6">
            <InterviewQuestions applicantId={id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicantDetails;
