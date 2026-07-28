import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import PageMeta from "../../components/common/PageMeta";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  useInquiry,
  useUpdateInquiry,
  useDeleteInquiry,
} from "../../hooks/queries";
import { toPlainString } from "../../utils/strings";
import Swal from "../../utils/swal";
import type { InquiryStatus } from "../../services/inquiriesService";
import MessageModal from "../../components/modals/MessageModal";
import {
  ChevronLeftIcon,
  TrashBinIcon,
  MailIcon,
  UserIcon,
  CalenderIcon,
  ChatIcon,
  TimeIcon,
  DownloadIcon,
} from "../../icons";

const statusStyles: Record<InquiryStatus, { dot: string; label: string }> = {
  new: { dot: "bg-blue-500", label: "statusNew" },
  in_progress: { dot: "bg-amber-500", label: "statusInProgress" },
  resolved: { dot: "bg-green-500", label: "statusResolved" },
  closed: { dot: "bg-gray-400", label: "statusClosed" },
};

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-US",
    { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }
  );
}

function IconMessageSquareText({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M7 8h10" /><path d="M7 12h8" />
    </svg>
  );
}

function IconSave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function IconFileText({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
    </svg>
  );
}

export default function InquiryPreview() {
  const { t, locale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("Inquiry Management", "write");

  const { data, isLoading } = useInquiry(id!);
  const inquiry = (data as any)?.inquiry ?? data;

  const updateMutation = useUpdateInquiry();
  const deleteMutation = useDeleteInquiry();

  const [selectedStatus, setSelectedStatus] = useState<InquiryStatus>("new");
  const [comment, setComment] = useState("");
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  useEffect(() => {
    if (inquiry) {
      setSelectedStatus(inquiry.status);
      setComment(inquiry.comment || "");
    }
  }, [inquiry]);

  const handleStatusUpdate = () => {
    if (!inquiry) return;
    if (selectedStatus === inquiry.status && comment === (inquiry.comment || "")) return;
    updateMutation.mutate({ id: id!, payload: { status: selectedStatus, comment } });
  };

  const handleDelete = async () => {
    if (!inquiry) return;
    const result = await Swal.fire({
      title: t("confirmDelete", "common"),
      text: t("actionCannotBeUndone", "common"),
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: t("cancel", "common"),
      confirmButtonColor: "#dc2626",
      confirmButtonText: t("delete", "common"),
    });
    if (result.isConfirmed) {
      deleteMutation.mutate(inquiry._id, {
        onSuccess: () => navigate("/inquiries"),
      });
    }
  };

  if (isLoading) return <LoadingSpinner fullPage />;

  if (!inquiry) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <div className="size-16 bg-white dark:bg-gray-900 rounded-full shadow-sm border border-gray-200 dark:border-gray-800 flex items-center justify-center mx-auto mb-6">
            <IconMessageSquareText className="size-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t("inquiryNotFound", "inquiries")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            {t("inquiryNotFoundText", "inquiries")}
          </p>
          <button
            onClick={() => navigate("/inquiries")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:opacity-90 transition-all"
          >
            <ChevronLeftIcon className="size-4" />
            {t("backToInquiries", "inquiries")}
          </button>
        </div>
      </div>
    );
  }

  const status = statusStyles[inquiry.status as InquiryStatus] || statusStyles.new;
  const subjectText = toPlainString(inquiry.subject);
  const respondentName = inquiry.respondedBy
    ? toPlainString(inquiry.respondedBy.fullName)
    : null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <PageMeta
        title={t("inquiryPreviewTitle", "inquiries")}
        description={t("inquiryPreviewDesc", "inquiries")}
      />

      <div className="px-6 sm:px-10 lg:px-16 py-6 sm:py-10 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/inquiries")}
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ChevronLeftIcon className="size-4" />
            {t("backToInquiries", "inquiries")}
          </button>

          {canWrite && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <TrashBinIcon className="size-4" />
              {t("delete", "common")}
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mb-8">
          <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="size-14 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-600 dark:text-gray-300">
                    {inquiry.name?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {subjectText}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {inquiry.name} &lt;{inquiry.email}&gt;
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className={`size-2 rounded-full ${status.dot}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t(status.label, "inquiries")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <TimeIcon className="size-4" />
                  {formatDate(inquiry.createdAt, locale)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 lg:divide-x lg:divide-y-0 divide-y divide-gray-100 dark:divide-gray-800">
            <div className="lg:col-span-3 p-8 space-y-8">
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  {t("inquiryDetails", "inquiries")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-5">
                  <div>
                    <dt className="text-xs text-gray-400 mb-1">{t("name", "common")}</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <UserIcon className="size-3.5 text-gray-300 dark:text-gray-600" />
                      {inquiry.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 mb-1">{t("email", "common")}</dt>
                    <dd>
                      <a
                        href={`mailto:${inquiry.email}`}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5"
                      >
                        <MailIcon className="size-3.5" />
                        {inquiry.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 mb-1">{t("date", "inquiries")}</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <CalenderIcon className="size-3.5 text-gray-300 dark:text-gray-600" />
                      {formatDate(inquiry.createdAt, locale)}
                    </dd>
                  </div>
                  {respondentName && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-1">{t("respondedBy", "inquiries")}</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <UserIcon className="size-3.5 text-gray-300 dark:text-gray-600" />
                        {respondentName}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-gray-400 mb-1">{t("status", "inquiries")}</dt>
                    <dd className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${status.dot}`} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t(status.label, "inquiries")}
                      </span>
                    </dd>
                  </div>
                </div>
              </section>

              <section className="border-t border-gray-100 dark:border-gray-800 pt-8">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  {t("message", "common")}
                </h2>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 p-5">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {inquiry.message}
                  </p>
                </div>
              </section>

              <section className="border-t border-gray-100 dark:border-gray-800 pt-8">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ChatIcon className="size-4" />
                  {t("comment", "inquiries") || "Comment"}
                </h2>
                {canWrite ? (
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={4}
                    className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 p-4 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 resize-none transition-all placeholder:text-gray-400"
                  />
                ) : inquiry.comment ? (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{inquiry.comment}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No comment</p>
                )}
              </section>

              {inquiry.attachments && inquiry.attachments.length > 0 && (
                <section className="border-t border-gray-100 dark:border-gray-800 pt-8">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    {t("attachments", "common")} ({inquiry.attachments.length})
                  </h2>
                  <div className="space-y-2">
                    {inquiry.attachments.map((att: any, idx: number) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors group"
                      >
                        <div className="size-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                          <IconFileText className="size-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {att.filename || "Attachment"}
                          </p>
                          {att.size && (
                            <p className="text-xs text-gray-400 mt-0.5">{formatFileSize(att.size)}</p>
                          )}
                        </div>
                        <DownloadIcon className="size-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="lg:col-span-1 p-8 space-y-8">
              {canWrite && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    {t("status", "inquiries")}
                  </h2>
                  <div className="space-y-3">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as InquiryStatus)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 transition-all cursor-pointer"
                    >
                      <option value="new">{t("statusNew", "inquiries")}</option>
                      <option value="in_progress">{t("statusInProgress", "inquiries")}</option>
                      <option value="resolved">{t("statusResolved", "inquiries")}</option>
                      <option value="closed">{t("statusClosed", "inquiries")}</option>
                    </select>

                    <button
                      onClick={handleStatusUpdate}
                      disabled={(selectedStatus === inquiry.status && comment === (inquiry.comment || "")) || updateMutation.isPending}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-40"
                    >
                      <IconSave className="size-4" />
                      {t("save", "inquiries")}
                    </button>
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  {t("inquiryDetails", "inquiries")}
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xs text-gray-400">{t("status", "inquiries")}</span>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <span className={`size-1.5 rounded-full ${status.dot}`} />
                      {t(status.label, "inquiries")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xs text-gray-400">{t("submittedBy", "inquiries")}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate ml-2">
                      {inquiry.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xs text-gray-400">{t("date", "inquiries")}</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(inquiry.createdAt).toLocaleDateString(
                        locale === "ar" ? "ar-EG" : "en-US"
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <button
                  onClick={() => setIsMessageModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all"
                >
                  <MailIcon className="size-4" />
                  {t("reply", "inquiries")}
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>

      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        applicant={{ email: inquiry.email, _id: inquiry._id, name: inquiry.name }}
        id={inquiry._id}
        company={inquiry.companyId || undefined}
        defaultFrom={!inquiry.companyId ? "noreply@sabergroup-eg.com" : undefined}
        isInquiry
      />
    </div>
  );
}
