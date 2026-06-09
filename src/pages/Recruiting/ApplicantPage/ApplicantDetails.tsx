import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import PersonalInfo from './components/ApplicantData/PersonalInfo';
import ActivityFeed from './components/ActivityFeed';
import CustomResponses from './components/ApplicantData/CustomResponses';
import JobSpec from './components/ApplicantData/JobSpec';
import InterviewQuestions from './components/InterviewData/InterviewQuestions';
import History from './components/history/History';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Swal from '../../../utils/swal';
import {
  useApplicant,
  useUpdateApplicant,
  useUpdateApplicantStatus,
  useAddComment,
  useDeleteApplicant,
  useJobPosition,
  useCompany,
  useCompanies,
  useScheduleInterview,
  useUpdateInterviewStatus,
  useSendEmail,
  useSendMessage,
} from '../../../hooks/queries';
import { resolveCompanyAddress } from '../../../utils/companyAddress';
import type {
  Applicant,
  ResponseSection,
  Interview,
  Activity,
  ScheduleInterviewRequest,
} from '../../../types/applicants';
import StatusChangeModal from '../../../components/modals/StatusChangeModal';
import CommentModal from '../../../components/modals/commentmodal';
import MessageModal from '../../../components/modals/MessageModal';
import InterviewSettingsModal from '../../../components/modals/InterviewSettingsModal';
import InterviewScheduleModal from '../../../components/modals/InterviewScheduleModal';
import { Modal } from '../../../components/ui/modal';
import { paths } from '../../../router/Paths';
import { getErrorMessage } from '../../../utils/errorHandler';
import { generateApplicantPdf } from '../../../utils/applicantPdfGenerator';
import {
  buildCustomResponseSections,
  extractCustomFieldsFromJobPosition,
} from './utils/customResponseUtils';
import { buildActivities } from './utils/activityUtils';
import { buildJobSpecItems } from './utils/jobSpecUtils';
import type { JobSpecItem } from '../../../types/applicants';

// Resolve a possibly-string-or-object id field (companyId, jobPositionId) into
// a plain string. Handles arrays by returning the first resolvable id.
const resolveId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = resolveId(item);
      if (resolved) return resolved;
    }
    return undefined;
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as { _id?: string; id?: string };
    if (typeof obj._id === 'string') return obj._id;
    if (typeof obj.id === 'string') return obj.id;
  }
  return undefined;
};

// Resolve the sender ("from") email for a company. The modal may have already
// picked one (customEmail) — use that; otherwise fall back to the company's
// default mail, contact email, or the first available sender.
const resolveSenderEmail = (
  company:
    | (Record<string, unknown> & {
        settings?: { mailSettings?: { defaultMail?: string; availableMails?: string[] } };
        mailSettings?: { defaultMail?: string; availableMails?: string[] };
        contactEmail?: string;
        email?: string;
        availableMails?: string[];
      })
    | null,
  customEmail: string,
): string => {
  const mailSettings = company?.settings?.mailSettings || company?.mailSettings || null;
  const availableMails: string[] = [
    ...(mailSettings?.availableMails || []),
    ...(company?.availableMails || []),
  ].filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
  const firstAvailable = availableMails[0];
  const mailDefault =
    mailSettings?.defaultMail || company?.contactEmail || company?.email || firstAvailable || '';
  return (customEmail || mailDefault || '').trim();
};

const escapeHtml = (s: string): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ApplicantDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: applicant, isLoading: isApplicantLoading, isFetching: isApplicantFetching, isError, error, refetch } = useApplicant(id || '');
  const updateApplicant = useUpdateApplicant();
  const updateStatus = useUpdateApplicantStatus();
  const addComment = useAddComment();
  const deleteApplicant = useDeleteApplicant();
  const scheduleInterviewMutation = useScheduleInterview();
  const updateInterviewStatusMutation = useUpdateInterviewStatus();
  const sendEmailMutation = useSendEmail();
  const sendMessageMutation = useSendMessage();

  const applicantJobPositionId = useMemo(() => {
    if (!applicant) return '';
    const jpId = (applicant as unknown as { jobPositionId?: unknown }).jobPositionId;
    if (typeof jpId === 'string') return jpId;
    if (jpId && typeof jpId === 'object') {
      const obj = jpId as { _id?: string; id?: string };
      return obj?._id || obj?.id || '';
    }
    return '';
  }, [applicant]);

  const applicantCompanyId = useMemo(() => {
    if (!applicant) return '';
    const cId = (applicant as unknown as { companyId?: unknown }).companyId;
    if (typeof cId === 'string') return cId;
    if (cId && typeof cId === 'object') {
      const obj = cId as { _id?: string; id?: string };
      return obj?._id || obj?.id || '';
    }
    return '';
  }, [applicant]);

  const { data: fetchedJobPosition, isLoading: isJobPositionLoading, isFetching: isJobPositionFetching } = useJobPosition(applicantJobPositionId, {
    enabled: !!applicantJobPositionId,
    useInitialData: false,  // bypass stale list cache to ensure jobSpecs (with weights) are present
  });

  // The applicant's `companyId` is sometimes empty in the API response, but the
  // job position always carries the company reference. Match the main branch's
  // `jobPosCompanyId` resolution so we can still find the company for the
  // `/mail` payload.
  const jobPosCompanyId = useMemo(() => {
    const fromApplicant = (() => {
      if (!applicant) return '';
      const jpId = (applicant as unknown as { jobPositionId?: unknown }).jobPositionId;
      if (jpId && typeof jpId === 'object') {
        const cId = (jpId as { companyId?: unknown }).companyId;
        if (typeof cId === 'string' && cId) return cId;
        if (cId && typeof cId === 'object') {
          const obj = cId as { _id?: string; id?: string };
          return obj?._id || obj?.id || '';
        }
      }
      return '';
    })();
    if (fromApplicant) return fromApplicant;
    const jp = fetchedJobPosition as { companyId?: unknown } | null | undefined;
    const cId = jp?.companyId;
    if (typeof cId === 'string' && cId) return cId;
    if (cId && typeof cId === 'object') {
      const obj = cId as { _id?: string; id?: string };
      return obj?._id || obj?.id || '';
    }
    return '';
  }, [applicant, fetchedJobPosition]);
  const jobCustomFields = useMemo<unknown[]>(
    () => extractCustomFieldsFromJobPosition(fetchedJobPosition),
    [fetchedJobPosition],
  );
  const { data: fetchedCompany, isLoading: isCompanyLoading, isFetching: isCompanyFetching} = useCompany(jobPosCompanyId || applicantCompanyId, {
    enabled: !!(jobPosCompanyId || applicantCompanyId),
  });

  // Also load the list (super admin has empty user.companies, so useCompanies() calls the list endpoint).
  // The list response carries the full `address` array, which the detail endpoint omits.
  const { data: companiesList = [] } = useCompanies();
  const companyFromList = useMemo(() => {
    if (!applicantCompanyId) return null;
    return companiesList.find((c: any) => c?._id === applicantCompanyId) ?? null;
  }, [companiesList, applicantCompanyId]);

  const companyWithAddress = useMemo(() => {
    if (!fetchedCompany && !companyFromList) return null;
    const detail: any = fetchedCompany || {};
    const list: any = companyFromList || {};
    const merged: any = { ...list, ...detail };

    // Address: prefer detail if non-empty, else fall back to list
    const detailHasAddress = Array.isArray(detail.address) && detail.address.length > 0;
    const listHasAddress = Array.isArray(list.address) && list.address.length > 0;
    if (detailHasAddress) {
      merged.address = detail.address;
    } else if (listHasAddress) {
      merged.address = list.address;
    } else if (detail.address !== undefined) {
      merged.address = detail.address;
    } else if (list.address !== undefined) {
      merged.address = list.address;
    }

    if (!merged.addresses && list.addresses) {
      merged.addresses = list.addresses;
    }
    // Settings (incl. email templates) — prefer detail if it has any
    // mailSettings/emailTemplates, else fall back to the list (the list
    // endpoint usually carries the full settings object).
    const detailHasMailSettings =
      detail.settings?.mailSettings &&
      (Array.isArray(detail.settings.mailSettings.emailTemplates) ||
        detail.settings.mailSettings.defaultMail ||
        Array.isArray(detail.settings.mailSettings.availableMails) ||
        detail.settings.mailSettings.companyDomain);
    const listHasMailSettings =
      list.settings?.mailSettings &&
      (Array.isArray(list.settings.mailSettings.emailTemplates) ||
        list.settings.mailSettings.defaultMail ||
        Array.isArray(list.settings.mailSettings.availableMails) ||
        list.settings.mailSettings.companyDomain);
    if (detailHasMailSettings) {
      merged.settings = detail.settings;
    } else if (listHasMailSettings) {
      merged.settings = list.settings;
    } else if (!merged.settings || Object.keys(merged.settings || {}).length === 0) {
      if (list.settings) merged.settings = list.settings;
    }
    if (!merged.location && list.location) {
      merged.location = list.location;
    }
    if (!merged.locations && list.locations) {
      merged.locations = list.locations;
    }
    if (!merged.officeAddress && list.officeAddress) {
      merged.officeAddress = list.officeAddress;
    }
    return merged;
  }, [fetchedCompany, companyFromList]);

  const [comment, setComment] = useState('');
  const [commentForm, setCommentForm] = useState({ text: '' });
  const [commentError, setCommentError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'interview' | 'history'>('details');
  const [visitedTabs, setVisitedTabs] = useState<Set<'details' | 'interview' | 'history'>>(
    () => new Set(['details']),
  );
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedApplicant, setEditedApplicant] = useState<Partial<Applicant> | null>(null);
  const [editedSections, setEditedSections] = useState<ResponseSection[]>([]);
  const [editedSpecAnswers, setEditedSpecAnswers] = useState<Record<string, boolean>>({});

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState<{ status: string; notes?: string; reasons?: string[] }>({
    status: '',
    notes: '',
    reasons: [],
  });
  const [statusError, setStatusError] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showInterviewSettingsModal, setShowInterviewSettingsModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [autoSelectInterviewId, setAutoSelectInterviewId] = useState<string | null>(null);

  const [formResetKey, setFormResetKey] = useState(0);
  const [interviewForm, setInterviewForm] = useState<{
    date: string;
    time: string;
    description: string;
    comment: string;
    location: string;
    link: string;
    type: 'phone' | 'video' | 'in-person';
    conductedBy?: string;
  }>({
    date: '',
    time: '',
    description: '',
    comment: '',
    location: '',
    link: '',
    type: 'phone',
  });
  const [interviewError, setInterviewError] = useState('');
  const [isSubmittingInterview, setIsSubmittingInterview] = useState(false);
  const [notificationChannels, setNotificationChannels] = useState({
    email: true,
    sms: false,
    whatsapp: false,
  });
  const [emailOption, setEmailOption] = useState<'company' | 'user' | 'custom' | 'new'>(
    'company'
  );
  const [customEmail, setCustomEmail] = useState('');
  const [phoneOption, setPhoneOption] = useState<
    'company' | 'user' | 'whatsapp' | 'custom'
  >('company');
  const [customPhone, setCustomPhone] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [interviewEmailSubject, setInterviewEmailSubject] = useState('Interview Invitation');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    if (showStatusModal && applicant) {
      setStatusForm({
        status: applicant.status || '',
        notes: '',
        reasons: [],
      });
      setStatusError('');
    }
  }, [showStatusModal, applicant]);

  const getJobTitle = useCallback((): { en: string } => {
    if (!applicant) return { en: '' };
    const jobPos =
      fetchedJobPosition ||
      (typeof applicant.jobPositionId === 'object'
        ? (applicant.jobPositionId as unknown as { _id?: string; title?: unknown })
        : null);
    if (jobPos && (jobPos as { title?: unknown }).title) {
      const title = (jobPos as { title?: unknown }).title;
      if (typeof title === 'string') return { en: title };
      if (typeof title === 'object' && (title as { en?: string })?.en) {
        return { en: (title as { en?: string }).en || '' };
      }
    }
    return { en: '' };
  }, [applicant, fetchedJobPosition]);

  const fillCompanyAddress = (): boolean => {
    try {
      const resolved = resolveCompanyAddress(companyWithAddress);
      if (resolved && resolved.trim()) {
        setInterviewForm((prev) => ({ ...prev, location: resolved.trim() }));
        return true;
      }
      return false;
    } catch (e) {
      void e;
      return false;
    }
  };

  const buildInterviewEmailHtml = useCallback((opts: {
    subject: string;
    jobTitle: string;
    rawMessage: string;
    applicantName?: string;
  }): string => {
    const { subject, rawMessage, applicantName, jobTitle } = opts;
    const replacements: Record<string, string> = {
      '{{candidateName}}': applicantName || 'Candidate',
      '{{jobTitle}}': jobTitle || '',
    };
    const tokens = Object.keys(replacements);
    let processedSubject = subject;
    let processedBody = rawMessage || '';
    tokens.forEach((token) => {
      const value = replacements[token];
      const variants = [
        token,
        token.toLowerCase(),
        token.charAt(0).toUpperCase() + token.slice(1).toLowerCase(),
        token.toLowerCase().replace(/\s/g, ''),
      ];
      variants.forEach((v) => {
        const regex = new RegExp(v.replace(/[{}]/g, '\\$&'), 'gi');
        processedSubject = processedSubject.replace(regex, value);
        processedBody = processedBody.replace(regex, value);
      });
    });

    const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    processedBody = processedBody.replace(urlRegex, (url) => {
      const href = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;text-decoration:underline;">${escapeHtml(url)}</a>`;
    });

    const sanitized = processedBody;
    const hasHtml = sanitized.indexOf('<') !== -1;
    const bodyHtml = hasHtml
      ? sanitized
      : sanitized
          .split(/\r?\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
          .map((p) => `<p style="margin:0 0 12px;color:#444;">${escapeHtml(p)}</p>`)
          .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(processedSubject)}</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; margin: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 24px 30px; text-align: center;">
      <h1 style="color: #111827; margin: 0; font-size: 22px; font-weight: 700;">${escapeHtml(processedSubject)}</h1>
    </div>
    <div style="padding: 30px;">
      <div style="font-size: 16px; line-height: 1.6; color: #444;">${bodyHtml}</div>
    </div>
  </div>
</body>
</html>`;
  }, []);

  const sendInterviewNotification = useCallback(
    async (snapshot: {
      subject: string;
      template: string;
      customEmail: string;
    }) => {
      if (!applicant || !id) return;

      const toEmail = (applicant as { email?: string }).email;
      if (!toEmail) {
        await Swal.fire({
          title: 'Email Skipped',
          text: 'Interview scheduled, but the applicant has no email address on file, so no notification email was sent.',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const fromEmail = resolveSenderEmail(companyWithAddress as never, snapshot.customEmail);
      if (!fromEmail) {
        await Swal.fire({
          title: 'Email Skipped',
          text: 'Interview scheduled, but no sender email is configured for this company. To send notification emails, please select a sender in the Schedule Interview modal or configure the company default email in Mail Settings.',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const jobTitle = getJobTitle().en || '';
      const applicantName = (applicant as { fullName?: string }).fullName || 'Candidate';

      const subjectBase = snapshot.subject || 'Interview Invitation';
      const processedSubject = subjectBase
        .replace(/\{\{\s*candidateName\s*\}\}/gi, applicantName)
        .replace(/\{\{\s*(?:position|jobTitle)\s*\}\}/gi, jobTitle);

      const emailHtml = buildInterviewEmailHtml({
        subject: subjectBase,
        jobTitle,
        rawMessage: snapshot.template || '',
        applicantName,
      });

      const jobPositionId =
        resolveId((applicant as { jobPositionId?: unknown }).jobPositionId) ||
        resolveId((applicant as { jobPosition?: unknown }).jobPosition);

      const resolvedCompanyId =
        (companyWithAddress as { _id?: string } | null)?._id ||
        jobPosCompanyId ||
        applicantCompanyId ||
        resolveId((applicant as { companyId?: unknown }).companyId);

      try {
        await sendEmailMutation.mutateAsync({
          company: resolvedCompanyId,
          jobPosition: jobPositionId,
          applicant: applicant._id,
          to: toEmail,
          from: fromEmail,
          subject: processedSubject,
          html: emailHtml,
        });

        // Best-effort: log the email to the applicant's message history.
        try {
          await sendMessageMutation.mutateAsync({
            id,
            data: { type: 'email', content: snapshot.template || '' },
          });
        } catch {
          // History logging is non-critical; ignore.
        }
      } catch (mailErr) {
        // The interview is already scheduled — only the email failed.
        const msg = getErrorMessage(mailErr);
        await Swal.fire({
          title: 'Interview Scheduled',
          text: `The interview was scheduled, but the notification email failed: ${msg}`,
          icon: 'warning',
          confirmButtonColor: '#3085d6',
        });
        setInterviewError(`Interview scheduled, but email failed: ${msg}`);
      }
    },
    [applicant, id, companyWithAddress, jobPosCompanyId, applicantCompanyId, getJobTitle, buildInterviewEmailHtml, sendEmailMutation, sendMessageMutation],
  );

  const handleScheduleInterviewSubmit = async () => {
    if (!id || !applicant) return;
    setIsSubmittingInterview(true);

    // Snapshot the email-related state BEFORE we reset the form below — we
    // still need these values to send the email after the schedule succeeds.
    const emailSnapshot = {
      subject: interviewEmailSubject,
      template: messageTemplate,
      customEmail,
    };

    try {
      let scheduledAt: string | undefined;
      if (interviewForm.date && interviewForm.time) {
        const [year, month, day] = interviewForm.date.split('-').map(Number);
        const [hours, minutes] = interviewForm.time.split(':').map(Number);
        const pad = (n: number) => String(n).padStart(2, '0');
        scheduledAt = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
      } else if (interviewForm.date) {
        scheduledAt = `${interviewForm.date}T00:00:00`;
      }

      const interviewData: ScheduleInterviewRequest = {
        scheduledAt,
        description: interviewForm.description || undefined,
        type: interviewForm.type || undefined,
        location: interviewForm.location || undefined,
        videoLink: interviewForm.link || undefined,
        notes: interviewForm.comment || undefined,
        conductedBy: interviewForm.conductedBy || undefined,
        status: 'scheduled',
        notifications: {
          channels: {
            email: notificationChannels.email,
            sms: notificationChannels.sms,
            whatsapp: notificationChannels.whatsapp,
          },
          emailOption,
          customEmail: customEmail || undefined,
          phoneOption,
          customPhone: customPhone || undefined,
        },
      };

      const result = await scheduleInterviewMutation.mutateAsync({ id, data: interviewData });
      const updatedApplicant = result as { interviews?: Interview[] } | undefined;
      const created = (updatedApplicant?.interviews || [])
        .slice()
        .sort((a, b) => {
          const aTime = new Date(a.createdAt || a.scheduledAt || 0).getTime();
          const bTime = new Date(b.createdAt || b.scheduledAt || 0).getTime();
          return bTime - aTime;
        })[0];

      setInterviewForm({
        date: '',
        time: '',
        description: '',
        comment: '',
        location: '',
        link: '',
        type: 'phone',
      });
      setNotificationChannels({ email: true, sms: false, whatsapp: false });
      setEmailOption('company');
      setCustomEmail('');
      setPhoneOption('company');
      setCustomPhone('');
      setMessageTemplate('');
      setInterviewEmailSubject('Interview Invitation');
      setFormResetKey((prev) => prev + 1);
      setShowScheduleModal(false);

      setActiveTab('interview');
      if (created && (created._id || created.id)) {
        setAutoSelectInterviewId(String(created._id || created.id));
      }

      if (notificationChannels.email) {
        await sendInterviewNotification(emailSnapshot);
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setInterviewError(msg);
    } finally {
      setIsSubmittingInterview(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !statusForm.status) {
      setStatusError('Please select a status before submitting.');
      return;
    }
    try {
      const payload: { status: string; notes?: string; reasons?: string[] } = {
        status: statusForm.status,
      };
      if (statusForm.notes && statusForm.notes.trim()) payload.notes = statusForm.notes.trim();
      if (statusForm.status === 'rejected' && statusForm.reasons && statusForm.reasons.length) {
        payload.reasons = statusForm.reasons;
      }
      await updateStatus.mutateAsync({ id, data: payload });
      setShowStatusModal(false);
    } catch {
      // toast handled by mutation
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentForm.text.trim() || !id) {
      setCommentError('Please enter a comment.');
      return;
    }
    try {
      await addComment.mutateAsync({ id, data: { comment: commentForm.text.trim() } });
      setCommentForm({ text: '' });
      setCommentError('');
      setShowCommentModal(false);
    } catch {
      // toast handled by mutation
    }
  };

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
      setEditedSections(buildCustomResponseSections(applicant, jobCustomFields));
      const specs = buildJobSpecItems(applicant, fetchedJobPosition);
      const initial: Record<string, boolean> = {};
      specs.forEach((s) => {
        initial[s.id] = s.answer;
      });
      setEditedSpecAnswers(initial);
    }
  }, [applicant, jobCustomFields, fetchedJobPosition]);

  const activities = useMemo<Activity[]>(() => buildActivities(applicant), [applicant]);
  const sections = useMemo<ResponseSection[]>(
    () => (isEditing ? editedSections : buildCustomResponseSections(applicant, jobCustomFields)),
    [isEditing, editedSections, applicant, jobCustomFields]
  );
  const jobSpecItems = useMemo<JobSpecItem[]>(() => {
    const base = buildJobSpecItems(applicant, fetchedJobPosition);
    if (!isEditing) return base;
    return base.map((item) =>
      Object.prototype.hasOwnProperty.call(editedSpecAnswers, item.id)
        ? { ...item, answer: editedSpecAnswers[item.id] }
        : item,
    );
  }, [applicant, fetchedJobPosition, isEditing, editedSpecAnswers]);

  const handleSpecAnswerChange = (specId: string, answer: boolean) => {
    setEditedSpecAnswers((prev) => ({ ...prev, [specId]: answer }));
  };

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

      const readLeafValue = (q: { type?: string; value?: unknown; selectedValue?: unknown; checked?: unknown; values?: unknown }): unknown => {
        switch (q.type) {
          case 'dropdown':
          case 'radio':
            return q.selectedValue ?? '';
          case 'checkbox':
            return Boolean(q.checked);
          case 'tags':
            return Array.isArray(q.values) ? q.values : [];
          default:
            return q.value ?? '';
        }
      };

      const customResponses: Record<string, unknown> = {};
      editedSections.forEach((section) => {
        const groups = new Map<string, Record<string, unknown>[]>();
        section.questions.forEach((q) => {
          if (!q) return;
          if (q.type === 'group' && 'groupId' in q && typeof (q as { groupId?: string }).groupId === 'string') {
            const group = q as { groupId: string; questions?: Array<{ id: string; type?: string; value?: unknown; selectedValue?: unknown; checked?: unknown; values?: unknown }> };
            const groupKey = group.groupId.replace(/_\d+$/, '');
            const entry: Record<string, unknown> = {};
            (group.questions || []).forEach((sq) => {
              const subKey = sq.id.startsWith(group.groupId + '_')
                ? sq.id.slice(group.groupId.length + 1)
                : sq.id;
              entry[subKey] = readLeafValue(sq);
            });
            const arr = groups.get(groupKey) ?? [];
            arr.push(entry);
            groups.set(groupKey, arr);
            return;
          }
          const leaf = q as { id: string; type?: string; value?: unknown; selectedValue?: unknown; checked?: unknown; values?: unknown };
          if (!leaf.id) return;
          customResponses[leaf.id] = readLeafValue(leaf);
        });
        groups.forEach((entries, key) => {
          customResponses[key] = entries.length === 1 ? entries[0] : entries;
        });
      });
      if (Object.keys(customResponses).length > 0) {
        payload.customResponses = customResponses;
      }

      const jobSpecsResponses = Object.entries(editedSpecAnswers).map(([jobSpecId, answer]) => ({
        jobSpecId,
        answer,
      }));
      if (jobSpecsResponses.length > 0) {
        payload.jobSpecsResponses = jobSpecsResponses;
      }

      await updateApplicant.mutateAsync({ id, data: payload as Parameters<typeof updateApplicant.mutateAsync>[0]['data'] });
      setEditedApplicant(null);
      setEditedSpecAnswers({});
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
      setEditedSections(buildCustomResponseSections(applicant, jobCustomFields));
      const specs = buildJobSpecItems(applicant, fetchedJobPosition);
      const reset: Record<string, boolean> = {};
      specs.forEach((s) => {
        reset[s.id] = s.answer;
      });
      setEditedSpecAnswers(reset);
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

  const handlePrint = useCallback(async () => {
    if (!applicant) return;
    Swal.fire({
      title: 'Generating PDF',
      text: 'Please wait while the applicant profile is being generated...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      await generateApplicantPdf(applicant, sections, jobSpecItems, fetchedJobPosition, companyWithAddress);
      Swal.close();
    } catch {
      Swal.close();
      await Swal.fire({
        title: 'Error',
        text: 'Failed to generate the PDF. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    }
  }, [applicant, sections, jobSpecItems, fetchedJobPosition, companyWithAddress]);

  // Only block the whole page on the *initial* load (no cached data yet).
  // `isLoading` is true only when there is no cached data AND a fetch is in
  // flight. Background revalidation (`isFetching`) is intentionally ignored
  // so navigating back / switching tabs shows cached data instantly.
  const isInitialPageLoad =
    (isApplicantLoading && !applicant) ||
    (!!applicantJobPositionId && isJobPositionLoading && !fetchedJobPosition) ||
    (!!applicantCompanyId && isCompanyLoading && !fetchedCompany);

  // Silence unused-variable warnings for fetching flags we deliberately ignore.
  void isApplicantFetching;
  void isJobPositionFetching;
  void isCompanyFetching;

  if (isInitialPageLoad) {
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
        <div className="mb-4">
  <div className="flex items-center justify-between">
    {/* Breadcrumb on the left */}
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span onClick={() => navigate(paths.applicants.root)} className="hover:text-gray-700 cursor-pointer">
        Applicants
      </span>
      <span>-›</span>
      <span className="text-gray-800">{applicant.fullName || 'Applicant Details'}</span>
    </div>
    
    {/* Buttons on the right */}
    <div className="flex">
      <button
        onClick={handleEdit}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        {isEditing ? 'Save' : 'Edit'}
      </button>
      {isEditing && (
        <button
          onClick={handleCancel}
          className="ml-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      )}
      <button
        onClick={handleDelete}
        className="ml-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
      >
        Delete
      </button>
    </div>
  </div>
</div>

   

        <div hidden={activeTab === 'details'} className="flex border-b border-gray-200 mb-6">
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
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
        </div>

        <div hidden={activeTab !== 'details'}>
          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            <div className="lg:w-80 flex-shrink-0 space-y-4">
              <PersonalInfo
                applicant={applicant}
                isEditing={isEditing}
                editedApplicant={editedApplicant}
                onChange={setEditedApplicant}
                onChangeStatus={() => setShowStatusModal(true)}
                onScheduleInterview={() => setShowScheduleModal(true)}
                onSendMessage={() => setShowMessageModal(true)}
                onPrint={handlePrint}
              />
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Send Job Offer
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Contract
                </button>
              </div>
            </div>
       
            
            <div className="flex-1 space-y-6">
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
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
        </div>
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
                <JobSpec
                  specs={jobSpecItems}
                  jobPosition={fetchedJobPosition}
                  editable={isEditing}
                  onSpecChange={handleSpecAnswerChange}
                />
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
          <div className="w-full mb-6">
            <ActivityFeed activities={activities} />
          </div>
        </div>

        {visitedTabs.has('interview') && (
          <div hidden={activeTab !== 'interview'} className="mb-6">
            <InterviewQuestions
              applicantId={id}
              onRequestScheduleInterview={() => setShowScheduleModal(true)}
              autoSelectInterviewId={autoSelectInterviewId}
            />
          </div>
        )}

        {visitedTabs.has('history') && (
          <div hidden={activeTab !== 'history'} className="mb-6">
            <History applicant={applicant} loading={isApplicantLoading} />
          </div>
        )}
      </div>

      <StatusChangeModal
        isOpen={showStatusModal}
        onClose={() => {
          if (updateStatus.isPending) return;
          setShowStatusModal(false);
          setStatusError('');
        }}
        statusForm={statusForm}
        setStatusForm={setStatusForm}
        statusError={statusError}
        setStatusError={setStatusError}
        handleStatusChange={handleStatusSubmit}
        isSubmittingStatus={updateStatus.isPending}
        companyId={applicantCompanyId}
        companySettings={companyWithAddress}
        jobIds={applicantJobPositionId ? [applicantJobPositionId] : []}
        jobs={fetchedJobPosition ? [fetchedJobPosition] : []}
      />

      <CommentModal
        isOpen={showCommentModal}
        onClose={() => {
          if (addComment.isPending) return;
          setShowCommentModal(false);
          setCommentError('');
        }}
        commentForm={commentForm}
        setCommentForm={setCommentForm}
        commentError={commentError}
        setCommentError={setCommentError}
        handleCommentSubmit={handleCommentSubmit}
        isSubmittingComment={addComment.isPending}
      />

      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        applicant={applicant}
        id={id || ''}
        company={companyWithAddress}
      />

      <InterviewScheduleModal
        isOpen={showScheduleModal}
        onClose={() => {
          if (isSubmittingInterview) return;
          setShowScheduleModal(false);
        }}
        formResetKey={formResetKey}
        interviewForm={interviewForm}
        setInterviewForm={setInterviewForm}
        interviewError={interviewError}
        setInterviewError={setInterviewError}
        handleInterviewSubmit={handleScheduleInterviewSubmit}
        fillCompanyAddress={fillCompanyAddress}
        notificationChannels={notificationChannels}
        setNotificationChannels={setNotificationChannels}
        emailOption={emailOption}
        setEmailOption={setEmailOption}
        customEmail={customEmail}
        setCustomEmail={setCustomEmail}
        phoneOption={phoneOption}
        setPhoneOption={setPhoneOption}
        customPhone={customPhone}
        setCustomPhone={setCustomPhone}
        messageTemplate={messageTemplate}
        setMessageTemplate={setMessageTemplate}
        interviewEmailSubject={interviewEmailSubject}
        setInterviewEmailSubject={setInterviewEmailSubject}
        isSubmittingInterview={isSubmittingInterview}
        setIsSubmittingInterview={setIsSubmittingInterview}
        setShowPreviewModal={setShowPreviewModal}
        setPreviewHtml={setPreviewHtml}
        buildInterviewEmailHtml={buildInterviewEmailHtml}
        getJobTitle={getJobTitle}
        applicant={applicant}
        companyData={companyWithAddress}
      />

      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewHtml('');
        }}
        className="max-w-2xl p-6"
      >
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Preview</h2>
          <div
            className="border rounded p-4 bg-white dark:bg-gray-800"
            style={{ maxHeight: '70vh', overflow: 'auto' }}
          >
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setShowPreviewModal(false);
                setPreviewHtml('');
              }}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <InterviewSettingsModal
        isOpen={showInterviewSettingsModal}
        onClose={() => {
          setShowInterviewSettingsModal(false);
          setSelectedInterview(null);
        }}
        applicant={applicant}
        selectedInterview={selectedInterview}
        setSelectedInterview={setSelectedInterview}
        setShowInterviewSettingsModal={setShowInterviewSettingsModal}
        updateInterviewMutation={updateInterviewStatusMutation}
      />
    </div>
  );
};

export default ApplicantDetails;
