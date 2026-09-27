import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import PageMeta from "../../components/common/PageMeta";
import {
  useInquiry,
  useUpdateInquiry,
  useDeleteInquiry,
} from "../../hooks/queries";
import { toPlainString } from "../../utils/strings";
import Swal from "../../utils/swal";
import type { InquiryStatus } from "../../services/inquiriesService";
import MessageModal from "../../components/modals/MessageModal";
import { Download, FileText, Info, Mail, MessageCircle, MessageSquareText, Paperclip, Save, Trash2 } from "lucide-react";
import {
  BackLink,
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  Field,
  PageShell,
  SectionTitle,
  focusRing,
  selectClass,
  textareaClass,
} from "../../components/ui/kit";
import type { BadgeTone } from "../../components/ui/kit";
import { DocCard, Meta } from "../../components/documents/DocumentUi";

const STATUS_META: Record<InquiryStatus, { tone: BadgeTone; label: string }> = {
  new: { tone: "blue", label: "statusNew" },
  in_progress: { tone: "amber", label: "statusInProgress" },
  resolved: { tone: "green", label: "statusResolved" },
  closed: { tone: "slate", label: "statusClosed" },
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

  const back = <BackLink onClick={() => navigate("/inquiries")}>{t("backToInquiries", "inquiries")}</BackLink>;

  if (isLoading) {
    return (
      <PageShell title={t("inquiryPreviewTitle", "inquiries")} back={back}>
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
      </PageShell>
    );
  }

  if (!inquiry) {
    return (
      <PageShell title={t("inquiryPreviewTitle", "inquiries")} back={back}>
        <Card>
          <EmptyState
            icon={<MessageSquareText className="size-6" />}
            title={t("inquiryNotFound", "inquiries")}
            text={t("inquiryNotFoundText", "inquiries")}
          />
        </Card>
      </PageShell>
    );
  }

  const status = STATUS_META[inquiry.status as InquiryStatus] || STATUS_META.new;
  const subjectText = toPlainString(inquiry.subject);
  const respondentName = inquiry.respondedBy ? toPlainString(inquiry.respondedBy.fullName) : null;
  const unchanged = selectedStatus === inquiry.status && comment === (inquiry.comment || "");

  return (
    <PageShell
      back={back}
      title={subjectText}
      subtitle={
        <span dir="ltr" className="inline-block">
          {inquiry.name} &lt;{inquiry.email}&gt;
        </span>
      }
      actions={
        <>
          <Button variant="primary" icon={<Mail className="size-4" />} onClick={() => setIsMessageModalOpen(true)}>
            {t("reply", "inquiries")}
          </Button>
          {canWrite && (
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={handleDelete}>
              {t("delete", "common")}
            </Button>
          )}
        </>
      }
    >
      <PageMeta title={t("inquiryPreviewTitle", "inquiries")} description={t("inquiryPreviewDesc", "inquiries")} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardToolbar>
              <SectionTitle icon={<Info className="size-4" />}>{t("inquiryDetails", "inquiries")}</SectionTitle>
              <Badge tone={status.tone}>{t(status.label, "inquiries")}</Badge>
            </CardToolbar>
            <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              <Meta label={t("name", "common")}>{inquiry.name}</Meta>
              <Meta label={t("email", "common")}>
                <a href={`mailto:${inquiry.email}`} dir="ltr" className={`rounded text-brand-600 hover:underline dark:text-brand-400 ${focusRing}`}>
                  {inquiry.email}
                </a>
              </Meta>
              <Meta label={t("date", "inquiries")}>{formatDate(inquiry.createdAt, locale)}</Meta>
              {respondentName && <Meta label={t("respondedBy", "inquiries")}>{respondentName}</Meta>}
            </dl>
          </Card>

          <DocCard icon={<MessageSquareText className="size-4" />} title={t("message", "common")}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{inquiry.message}</p>
          </DocCard>

          {inquiry.attachments && inquiry.attachments.length > 0 && (
            <DocCard icon={<Paperclip className="size-4" />} title={`${t("attachments", "common")} (${inquiry.attachments.length})`}>
              <ul className="space-y-2">
                {inquiry.attachments.map((att: any, idx: number) => (
                  <li key={idx}>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/40 ${focusRing}`}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <FileText className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 group-hover:text-brand-600 dark:text-white">
                          {att.filename || "Attachment"}
                        </span>
                        {att.size && <span className="block text-xs text-slate-500 dark:text-slate-400">{formatFileSize(att.size)}</span>}
                      </span>
                      <Download className="size-4 shrink-0 text-slate-400 group-hover:text-brand-500" />
                    </a>
                  </li>
                ))}
              </ul>
            </DocCard>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardToolbar>
              <SectionTitle icon={<MessageCircle className="size-4" />}>{t("comment", "inquiries")}</SectionTitle>
            </CardToolbar>
            <div className="space-y-3 p-4">
              {canWrite ? (
                <>
                  <Field label={t("status", "inquiries")} htmlFor="inq-status">
                    <select id="inq-status" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as InquiryStatus)} className={selectClass}>
                      <option value="new">{t("statusNew", "inquiries")}</option>
                      <option value="in_progress">{t("statusInProgress", "inquiries")}</option>
                      <option value="resolved">{t("statusResolved", "inquiries")}</option>
                      <option value="closed">{t("statusClosed", "inquiries")}</option>
                    </select>
                  </Field>
                  <Field label={t("comment", "inquiries")} htmlFor="inq-comment">
                    <textarea
                      id="inq-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t("commentPlaceholder", "inquiries")}
                      rows={4}
                      className={textareaClass}
                    />
                  </Field>
                  <Button variant="primary" className="w-full" icon={<Save className="size-4" />} onClick={handleStatusUpdate} disabled={unchanged} loading={updateMutation.isPending}>
                    {t("save", "inquiries")}
                  </Button>
                </>
              ) : inquiry.comment ? (
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{inquiry.comment}</p>
              ) : (
                <p className="text-sm italic text-slate-400">{t("noComment", "inquiries")}</p>
              )}
            </div>
          </Card>
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
    </PageShell>
  );
}
