import { describeError } from '../../../../../lib/userErrors';
// hooks/useBulkActions.ts
import { useState, useCallback } from 'react';
import Swal from '../../../../../utils/swal';
import { useLocale } from '../../../../../context/LocaleContext';
import {
  useScheduleBulkInterviews,
  useBatchUpdateApplicantStatus,
  useSendBatchEmail,
  useSendMessage,
} from '../../../../../hooks/queries';
import {
  buildInterviewEmailHtml,
  bulkInterviewStart,
  fillInterviewTemplate,
  resolveInterviewSender,
} from '../utils/interviewEmail';

interface SelectedApplicantForInterview {
  applicantId: string;
  applicantName: string;
  applicantNo: number | null;
  email: string;
  companyId: string;
  jobPositionId?: string;
  status: string;
}

interface BulkStatusForm {
  status?: string;
  reasons?: string[];
  notes?: string;
}

interface BulkInterviewForm {
  date: string;
  time: string;
  description: string;
  comment: string;
  location: string;
  link: string;
  type: 'phone' | 'video' | 'in-person';
}

interface BulkNotificationChannels {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

interface UseBulkActionsProps {
  selectedApplicantIds: string[];
  selectedApplicantsForInterview: SelectedApplicantForInterview[];
  selectedApplicantCompanyId: string | null;
  selectedApplicantCompany: any | null;
  /** Job title for the {{jobTitle}} placeholder in invitation emails. */
  jobTitleOf?: (jobPositionId?: string) => string;
  onClearSelection?: () => void;
}

interface UseBulkActionsReturn {
  // State
  isDeleting: boolean;
  isProcessing: boolean;
  isSubmittingBulkInterview: boolean;
  isSubmittingBulkStatus: boolean;
  showBulkModal: boolean;
  showBulkInterviewModal: boolean;
  showBulkInterviewPreviewModal: boolean;
  showBulkStatusModal: boolean;
  showBulkPreviewFallbackModal: boolean;
  bulkFormResetKey: number;
  bulkInterviewError: string;
  bulkStatusError: string;
  bulkDeleteError: string;
  bulkInterviewIntervalMinutes: number;
  bulkInterviewForm: BulkInterviewForm;
  bulkNotificationChannels: BulkNotificationChannels;
  bulkEmailOption: 'company' | 'new';
  bulkCustomEmail: string;
  bulkPhoneOption: 'company' | 'user' | 'whatsapp' | 'custom';
  bulkCustomPhone: string;
  bulkMessageTemplate: string;
  bulkInterviewEmailSubject: string;
  bulkPreviewHtml: string;
  bulkInterviewPreviewItems: any[];
  bulkStatusForm: BulkStatusForm;
  bulkAction: string;

  // Setters
  setShowBulkModal: (show: boolean) => void;
  setShowBulkInterviewModal: (show: boolean) => void;
  setShowBulkInterviewPreviewModal: (show: boolean) => void;
  setShowBulkStatusModal: (show: boolean) => void;
  setShowBulkPreviewFallbackModal: (show: boolean) => void;
  setBulkInterviewError: (error: string) => void;
  setBulkStatusError: (error: string) => void;
  setBulkDeleteError: (error: string) => void;
  setBulkInterviewIntervalMinutes: (minutes: number) => void;
  setBulkInterviewForm: (form: BulkInterviewForm | ((prev: BulkInterviewForm) => BulkInterviewForm)) => void;
  setBulkNotificationChannels: (channels: BulkNotificationChannels | ((prev: BulkNotificationChannels) => BulkNotificationChannels)) => void;
  setBulkEmailOption: (option: 'company' | 'new') => void;
  setBulkCustomEmail: (email: string) => void;
  setBulkPhoneOption: (option: 'company' | 'user' | 'whatsapp' | 'custom') => void;
  setBulkCustomPhone: (phone: string) => void;
  setBulkMessageTemplate: (template: string) => void;
  setBulkInterviewEmailSubject: (subject: string) => void;
  setBulkPreviewHtml: (html: string) => void;
  setBulkInterviewPreviewItems: (items: any[]) => void;
  setBulkStatusForm: (form: BulkStatusForm | ((prev: BulkStatusForm) => BulkStatusForm)) => void;
  setBulkAction: (action: string) => void;
  setIsProcessing: (processing: boolean) => void;

  // Actions
  handleBulkDelete: () => Promise<void>;
  handleBulkStatusChange: (e: React.FormEvent) => Promise<void>;
  handleBulkInterviewSubmit: (e: React.FormEvent, opts?: { senderEmail?: string }) => Promise<void>;
  handlePreviewBulkInterviews: () => void;
  handleBulkChangeStatus: (action: string) => Promise<void>;
  openBulkInterviewModal: () => Promise<void>;
  resetBulkInterviewModal: () => void;
  fillBulkCompanyAddress: () => boolean;
  getSelectedCompanyAddress: () => string;
}

const getErrorMessage = (err: unknown): string => describeError(err).message;

export function useBulkActions({
  selectedApplicantIds,
  selectedApplicantsForInterview,
  selectedApplicantCompanyId,
  selectedApplicantCompany,
  jobTitleOf,
  onClearSelection,
}: UseBulkActionsProps): UseBulkActionsReturn {
  const { t, locale } = useLocale();
  // Mutations
  const batchUpdateStatusMutation = useBatchUpdateApplicantStatus();
  const scheduleBulkInterviewsMutation = useScheduleBulkInterviews();
  const sendBatchEmailMutation = useSendBatchEmail();
  const sendMessageMutation = useSendMessage();

  // State
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmittingBulkInterview, setIsSubmittingBulkInterview] = useState(false);
  const [isSubmittingBulkStatus, setIsSubmittingBulkStatus] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showBulkInterviewModal, setShowBulkInterviewModal] = useState(false);
  const [showBulkInterviewPreviewModal, setShowBulkInterviewPreviewModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkPreviewFallbackModal, setShowBulkPreviewFallbackModal] = useState(false);
  const [bulkFormResetKey] = useState(0);
  const [bulkInterviewError, setBulkInterviewError] = useState('');
  const [bulkStatusError, setBulkStatusError] = useState('');
  const [bulkDeleteError, setBulkDeleteError] = useState('');
  const [bulkAction, setBulkAction] = useState('');
  const [bulkInterviewIntervalMinutes, setBulkInterviewIntervalMinutes] = useState(15);
  const [bulkInterviewForm, setBulkInterviewForm] = useState<BulkInterviewForm>({
    date: '',
    time: '',
    description: '',
    comment: '',
    location: '',
    link: '',
    type: 'phone',
  });
  const [bulkNotificationChannels, setBulkNotificationChannels] = useState<BulkNotificationChannels>({
    email: false,
    sms: false,
    whatsapp: false,
  });
  const [bulkEmailOption, setBulkEmailOption] = useState<'company' | 'new'>('company');
  const [bulkCustomEmail, setBulkCustomEmail] = useState('');
  const [bulkPhoneOption, setBulkPhoneOption] = useState<'company' | 'user' | 'whatsapp' | 'custom'>('company');
  const [bulkCustomPhone, setBulkCustomPhone] = useState('');
  const [bulkMessageTemplate, setBulkMessageTemplate] = useState('');
  const [bulkInterviewEmailSubject, setBulkInterviewEmailSubject] = useState('Interview Invitation');
  const [bulkPreviewHtml, setBulkPreviewHtml] = useState('');
  const [bulkInterviewPreviewItems, setBulkInterviewPreviewItems] = useState<any[]>([]);
  const [bulkStatusForm, setBulkStatusForm] = useState<BulkStatusForm>({
    status: '',
    reasons: [],
    notes: '',
  });

  // Helper to clear selection
  const clearSelection = useCallback(() => {
    if (onClearSelection) {
      onClearSelection();
    }
  }, [onClearSelection]);

  // Handle bulk delete (move to trash)
  const handleBulkDelete = useCallback(async () => {
    if (selectedApplicantIds.length === 0) return;

    const result = await Swal.fire({
      title: t('deleteApplicantsTitle', 'applicants'),
      text: t('deleteApplicantsText', 'applicants', { count: selectedApplicantIds.length }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: t('yes', 'common'),
      cancelButtonText: t('cancel', 'common'),
    });

    if (!result.isConfirmed) return;

    const updates = selectedApplicantIds.map((applicantId) => ({
      applicantId: applicantId,
      status: 'trashed',
      notes: `Moved to trash on ${new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}`,
    }));

    try {
      setIsDeleting(true);
      await batchUpdateStatusMutation.mutateAsync(updates);

      await Swal.fire({
        title: t('success', 'applicants'),
        text: t('movedToTrash', 'applicants', { count: selectedApplicantIds.length }),
        icon: 'success',
        position: 'center',
        timer: 2000,
        showConfirmButton: false,
      });

      clearSelection();
    } catch (err: any) {
      setBulkDeleteError(err.message || 'Failed to delete applicants');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedApplicantIds, batchUpdateStatusMutation, clearSelection]);

  // Handle bulk status change
  const handleBulkStatusChange = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedApplicantIds.length === 0) return;

      if (!bulkStatusForm.status || bulkStatusForm.status.trim() === '') {
        setBulkStatusError('Please select a status before submitting.');
        return;
      }

      const updates = selectedApplicantIds.map((applicantId) => {
        const update: any = {
          applicantId: applicantId,
          status: bulkStatusForm.status,
        };

        if (bulkStatusForm.notes && bulkStatusForm.notes.trim()) {
          update.notes = bulkStatusForm.notes.trim();
        }

        if (Array.isArray(bulkStatusForm.reasons) && bulkStatusForm.reasons.length) {
          update.reasons = bulkStatusForm.reasons.map((r) => String(r ?? '').trim()).filter(Boolean);
        }

        return update;
      });

      try {
        setIsSubmittingBulkStatus(true);
        setBulkStatusError('');

        await batchUpdateStatusMutation.mutateAsync(updates);

        await Swal.fire({
          title: t('success', 'applicants'),
          text: t('statusUpdateSuccess', 'applicants', { count: selectedApplicantIds.length }),
          icon: 'success',
          position: 'center',
          timer: 2000,
          showConfirmButton: false,
        });

        clearSelection();
        setBulkAction('');
        setShowBulkStatusModal(false);
        setBulkStatusForm({ status: '', reasons: [], notes: '' });
      } catch (err: any) {
        setBulkStatusError(err.message || 'Failed to update statuses');
      } finally {
        setIsSubmittingBulkStatus(false);
      }
    },
    [selectedApplicantIds, bulkStatusForm, batchUpdateStatusMutation, clearSelection]
  );

  // Handle bulk change status (triggered by button click)
  const handleBulkChangeStatus = useCallback(
    async (action: string) => {
      if (selectedApplicantIds.length === 0 || !action) return;

      if (action === 'rejected') {
        setBulkStatusForm({ status: 'rejected', reasons: [], notes: '' });
        setBulkStatusError('');
        setShowBulkStatusModal(true);
        return;
      }

      const result = await Swal.fire({
        title: t('changeStatusTitle', 'applicants'),
        text: t('statusChangedTo', 'applicants', { count: selectedApplicantIds.length, action }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: t('yes', 'common'),
      });

      if (!result.isConfirmed) return;

      try {
        setIsProcessing(true);
        
        // Use batch mutation instead of individual mutations
        const updates = selectedApplicantIds.map((applicantId) => ({
          applicantId: applicantId,
          status: action,
          notes: `Bulk status change to ${action} on ${new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}`,
        }));
        
        await batchUpdateStatusMutation.mutateAsync(updates);

        await Swal.fire({
          title: t('success', 'applicants'),
          text: t('statusUpdateSuccess', 'applicants', { count: selectedApplicantIds.length }),
          icon: 'success',
          position: 'center',
          timer: 2000,
          showConfirmButton: false,
        });

        clearSelection();
        setBulkAction('');
      } catch (err: any) {
        setBulkStatusError(getErrorMessage(err));
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedApplicantIds, batchUpdateStatusMutation, clearSelection]
  );

  // Get company address
  const getSelectedCompanyAddress = useCallback((): string => {
    const c: any = selectedApplicantCompany || {};
    const isInvalidAddressString = (value: string) => {
      const s = String(value || '').trim();
      if (!s) return true;
      if (/^[a-f0-9]{24}$/i.test(s)) return true;
      if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) return true;
      return false;
    };
    
    const candidates = [
      c.address,
      c.location,
      c.officeAddress,
      c.contactAddress,
      c.settings?.address,
      c.settings?.companyAddress,
    ];

    for (const value of candidates) {
      const plain = String(value || '').trim();
      if (plain && plain.trim() && !isInvalidAddressString(plain)) {
        return plain.trim();
      }
    }

    for (const [key, value] of Object.entries(c)) {
      if (!/address|location/i.test(key)) continue;
      const plain = String(value || '').trim();
      if (plain && plain.trim() && !isInvalidAddressString(plain)) {
        return plain.trim();
      }
    }

    return '';
  }, [selectedApplicantCompany]);

  // Fill company address
  const fillBulkCompanyAddress = useCallback((): boolean => {
    const address = getSelectedCompanyAddress();
    if (!address) return false;
    setBulkInterviewForm((prev) => ({ ...prev, location: address }));
    return true;
  }, [getSelectedCompanyAddress]);

  // Reset bulk interview modal
 const resetBulkInterviewModal = useCallback(() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const defaultDate = `${year}-${month}-${day}`;
  
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  const hours = String(nextHour.getHours()).padStart(2, '0');
  const minutes = '00';
  const defaultTime = `${hours}:${minutes}`;
  
  setBulkInterviewForm({
    date: defaultDate,
    time: defaultTime,
    type: 'phone',
    location: '',
    link: '',
    description: '',
    comment: '',
  });
  setBulkInterviewError('');
  setBulkInterviewIntervalMinutes(15);
  setBulkNotificationChannels({ email: false, sms: false, whatsapp: false });
  setBulkEmailOption('company');
  setBulkCustomEmail('');
  setBulkPhoneOption('company');
  setBulkCustomPhone('');
  setBulkMessageTemplate('');
  setBulkInterviewEmailSubject('Interview Invitation');
}, [setBulkInterviewForm, setBulkInterviewError, setBulkInterviewIntervalMinutes, setBulkNotificationChannels, setBulkEmailOption, setBulkCustomEmail, setBulkPhoneOption, setBulkCustomPhone, setBulkMessageTemplate, setBulkInterviewEmailSubject]);

  // Open bulk interview modal
  const openBulkInterviewModal = useCallback(async () => {
  if (selectedApplicantsForInterview.length === 0) return;

  if (!selectedApplicantCompanyId) {
    await Swal.fire({
      title: t('singleCompanyRequired', 'applicants'),
      text: t('singleCompanyRequiredDesc', 'applicants'),
      icon: 'warning',
    });
    return;
  }

  resetBulkInterviewModal();
  
  // Set default date to today
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const defaultDate = `${year}-${month}-${day}`;
  
  // Set default time to next hour (rounded up)
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  const hours = String(nextHour.getHours()).padStart(2, '0');
  const minutes = '00';
  const defaultTime = `${hours}:${minutes}`;
  
  // Also set default location from company if available
  let defaultLocation = '';
  if (selectedApplicantCompany) {
    const addresses = selectedApplicantCompany?.address || selectedApplicantCompany?.addresses || [];
    if (addresses.length > 0) {
      const firstAddress = addresses[0];
      if (typeof firstAddress === 'string') {
        defaultLocation = firstAddress;
      } else if (firstAddress?.location) {
        defaultLocation = firstAddress.location;
      } else if (firstAddress?.en) {
        defaultLocation = firstAddress.en;
      }
    }
  }
  
  setBulkInterviewForm({
    date: defaultDate,
    time: defaultTime,
    type: 'phone',
    location: defaultLocation,
    link: '',
    description: '',
    comment: '',
  });
  
  setShowBulkInterviewModal(true);
}, [selectedApplicantsForInterview, selectedApplicantCompanyId, selectedApplicantCompany, resetBulkInterviewModal, setBulkInterviewForm]);

  // Build bulk interview preview
  const buildBulkInterviewPreview = useCallback(() => {
    if (selectedApplicantsForInterview.length === 0) {
      return { error: 'Please select at least one applicant.', items: [] };
    }

    const baseDate = bulkInterviewStart(bulkInterviewForm.date, bulkInterviewForm.time);
    const items = selectedApplicantsForInterview.map((candidate, index) => {
      const scheduled = new Date(baseDate.getTime() + index * bulkInterviewIntervalMinutes * 60000);
      
      const interviewDate = scheduled.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const interviewTime = scheduled.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return {
        applicantId: candidate.applicantId,
        applicantName: candidate.applicantName,
        applicantNo: candidate.applicantNo?.toString() || '-',
        to: candidate.email,
        companyId: candidate.companyId,
        jobPositionId: candidate.jobPositionId,
        scheduledAt: scheduled.toISOString(),
        scheduledLabel: `${interviewDate} at ${interviewTime}`,
        subject: bulkInterviewEmailSubject,
        html: '',
        status: candidate.status,
      };
    });

    return { error: '', items };
  }, [selectedApplicantsForInterview, bulkInterviewIntervalMinutes, bulkInterviewEmailSubject, bulkInterviewForm.date, bulkInterviewForm.time, locale]);

  // Handle preview bulk interviews
  const handlePreviewBulkInterviews = useCallback(() => {
    setBulkInterviewError('');
    const built = buildBulkInterviewPreview();
    if (built.error) {
      setBulkInterviewError(built.error);
      return;
    }
    setBulkInterviewPreviewItems(built.items);
    setShowBulkInterviewPreviewModal(true);
  }, [buildBulkInterviewPreview]);

  // Handle bulk interview submit
  const handleBulkInterviewSubmit = useCallback(
    async (e: React.FormEvent, opts?: { senderEmail?: string }) => {
      e.preventDefault();
      setBulkInterviewError('');

      const built = buildBulkInterviewPreview();
      if (built.error) {
        setBulkInterviewError(built.error);
        return;
      }

      const previewItems = built.items;
      const missingEmails = previewItems.filter((item: any) => !item.to);

      try {
        setIsSubmittingBulkInterview(true);

        const bulkInterviewPayload = previewItems.map((item: any) => ({
          applicantId: item.applicantId,
          scheduledAt: item.scheduledAt,
          conductedBy: undefined,
          description: bulkInterviewForm.description || undefined,
          type: bulkInterviewForm.type || undefined,
          location: bulkInterviewForm.location || undefined,
          address: bulkInterviewForm.location || undefined,
          videoLink: bulkInterviewForm.link || undefined,
          notes: bulkInterviewForm.comment || undefined,
          status: 'scheduled',
        }));

        await scheduleBulkInterviewsMutation.mutateAsync(bulkInterviewPayload);

        // Update status to interview for each applicant using batch mutation
        const statusUpdates = previewItems
          .filter((item: any) => item.status !== 'interview')
          .map((item: any) => ({
            applicantId: item.applicantId,
            status: 'interview',
            notes: `Status updated to interview on ${new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')} (bulk interview scheduling)`,
          }));
        
        if (statusUpdates.length > 0) {
          await batchUpdateStatusMutation.mutateAsync(statusUpdates);
        }

        // The interviews are saved; the invitation emails go out next. An
        // email failure is reported but doesn't undo the scheduling.
        let emailResultNote = '';
        let emailProblem = '';
        const emailableItems = previewItems.filter((item: any) => Boolean(item.to));
        if (bulkNotificationChannels.email && emailableItems.length > 0) {
          const from = resolveInterviewSender(selectedApplicantCompany, opts?.senderEmail || bulkCustomEmail);
          if (!from) {
            emailProblem = t('interviewsNoSender', 'applicants');
          } else {
            const dateLocale = locale === 'ar' ? 'ar-EG' : 'en-US';
            const batch = emailableItems.map((item: any) => {
              const when = new Date(item.scheduledAt);
              const values = {
                candidateName: item.applicantName || t('candidate', 'applicantDetails'),
                jobTitle: jobTitleOf?.(item.jobPositionId) || '',
                interviewDate: when.toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                interviewTime: when.toLocaleTimeString(dateLocale, { hour: 'numeric', minute: '2-digit', hour12: true }),
                interviewType: t(bulkInterviewForm.type || 'phone', 'modals'),
                location: bulkInterviewForm.link || bulkInterviewForm.location || '',
                address: bulkInterviewForm.location || '',
              };
              const subject = fillInterviewTemplate(bulkInterviewEmailSubject || t('interviewInvitation', 'applicantDetails'), values, false);
              const body = fillInterviewTemplate(bulkMessageTemplate, values, true);
              return {
                to: item.to,
                from,
                subject,
                html: buildInterviewEmailHtml(subject, body),
                applicant: item.applicantId,
                jobPosition: item.jobPositionId,
                company: selectedApplicantCompanyId || item.companyId,
              };
            });
            try {
              await sendBatchEmailMutation.mutateAsync({
                company: String(selectedApplicantCompanyId || batch[0].company),
                batch,
              });
              emailResultNote =
                missingEmails.length > 0
                  ? t('emailSentTo', 'applicants', { sent: batch.length, skipped: missingEmails.length })
                  : t('interviewEmailsSent', 'applicants', { count: batch.length });
              // Log each invitation in the applicant's message history, as the
              // single-applicant flow does; a failure here isn't worth reporting.
              await Promise.allSettled(
                batch.map((email) =>
                  sendMessageMutation.mutateAsync({ id: email.applicant, data: { type: 'email', content: email.html } })
                )
              );
            } catch (mailErr) {
              emailProblem = t('interviewsEmailFailed', 'applicants', { msg: getErrorMessage(mailErr) });
            }
          }
        }

        // Close the modal first: it sits above SweetAlert and would hide it.
        clearSelection();
        setShowBulkInterviewModal(false);
        setShowBulkInterviewPreviewModal(false);
        resetBulkInterviewModal();

        const successMessageBase = t('interviewsScheduledFor', 'applicants', { count: previewItems.length });
        if (emailProblem) {
          await Swal.fire({ title: t('interviewsScheduledNoEmail', 'applicants'), text: emailProblem, icon: 'warning' });
        } else {
          await Swal.fire({
            title: t('success', 'applicants'),
            text: emailResultNote ? `${successMessageBase} ${emailResultNote}` : successMessageBase,
            icon: 'success',
            position: 'center',
            timer: 2500,
            showConfirmButton: false,
          });
        }
      } catch (err: any) {
        setBulkInterviewError(getErrorMessage(err));
      } finally {
        setIsSubmittingBulkInterview(false);
      }
    },
    [
      buildBulkInterviewPreview,
      bulkInterviewForm,
      bulkNotificationChannels,
      bulkCustomEmail,
      bulkMessageTemplate,
      bulkInterviewEmailSubject,
      selectedApplicantCompany,
      selectedApplicantCompanyId,
      jobTitleOf,
      locale,
      t,
      scheduleBulkInterviewsMutation,
      batchUpdateStatusMutation,
      sendBatchEmailMutation,
      sendMessageMutation,
      clearSelection,
      resetBulkInterviewModal,
    ]
  );

  return {
    // State
    isDeleting,
    isProcessing,
    isSubmittingBulkInterview,
    isSubmittingBulkStatus,
    showBulkModal,
    showBulkInterviewModal,
    showBulkInterviewPreviewModal,
    showBulkStatusModal,
    showBulkPreviewFallbackModal,
    bulkFormResetKey,
    bulkInterviewError,
    bulkStatusError,
    bulkDeleteError,
    bulkInterviewIntervalMinutes,
    bulkInterviewForm,
    bulkNotificationChannels,
    bulkEmailOption,
    bulkCustomEmail,
    bulkPhoneOption,
    bulkCustomPhone,
    bulkMessageTemplate,
    bulkInterviewEmailSubject,
    bulkPreviewHtml,
    bulkInterviewPreviewItems,
    bulkStatusForm,
    bulkAction,

    // Setters
    setShowBulkModal,
    setShowBulkInterviewModal,
    setShowBulkInterviewPreviewModal,
    setShowBulkStatusModal,
    setShowBulkPreviewFallbackModal,
    setBulkInterviewError,
    setBulkStatusError,
    setBulkDeleteError,
    setBulkInterviewIntervalMinutes,
    setBulkInterviewForm,
    setBulkNotificationChannels,
    setBulkEmailOption,
    setBulkCustomEmail,
    setBulkPhoneOption,
    setBulkCustomPhone,
    setBulkMessageTemplate,
    setBulkInterviewEmailSubject,
    setBulkPreviewHtml,
    setBulkInterviewPreviewItems,
    setBulkStatusForm,
    setBulkAction,
    setIsProcessing,

    // Actions
    handleBulkDelete,
    handleBulkStatusChange,
    handleBulkInterviewSubmit,
    handlePreviewBulkInterviews,
    handleBulkChangeStatus,
    openBulkInterviewModal,
    resetBulkInterviewModal,
    fillBulkCompanyAddress,
    getSelectedCompanyAddress,
  };
}