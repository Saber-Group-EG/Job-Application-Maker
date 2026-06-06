import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  Edit3,
  Mail,
  MessageSquarePlus,
  MoreVertical,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Applicant } from '../../../../../types/applicants';
import { paths } from '../../../../../router/Paths';

type ToolbarProps = {
  applicant: Applicant;
  isEditing: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onChangeStatus: () => void;
  onScheduleInterview: () => void;
  onSendMessage: () => void;
  onAddComment: () => void;
  onOpenInterviewSettings: () => void;
  onDelete: () => void;
  allApplicants?: Applicant[];
};

const baseButtonClass =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const secondaryButtonClass =
  'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200';

const statusButtonClass =
  'bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300';

const scheduleButtonClass =
  'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300';

const messageButtonClass =
  'bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300';

const editButtonClass =
  'bg-amber-500 text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300';

const saveButtonClass =
  'bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300';

export default function ApplicantActionsToolbar({
  applicant,
  isEditing,
  isSubmitting,
  isDeleting,
  onEdit,
  onCancelEdit,
  onChangeStatus,
  onScheduleInterview,
  onSendMessage,
  onAddComment,
  onOpenInterviewSettings,
  onDelete,
  allApplicants = [],
}: ToolbarProps) {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    if (moreOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const currentIndex = allApplicants.findIndex(
    (a) => String(a?._id) === String(applicant?._id),
  );
  const hasPagination = allApplicants.length > 0;
  const canGoPrev = hasPagination && currentIndex > 0;
  const canGoNext = hasPagination && currentIndex >= 0 && currentIndex < allApplicants.length - 1;

  const goTo = (id: string) => {
    if (!id) return;
    navigate(paths.applicants.details(id));
  };

  const statusLabel = applicant?.status
    ? applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1)
    : 'Status';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: back + pagination */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => navigate(paths.applicants.root)}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applicants
          </button>

          {hasPagination && (
            <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
              <button
                type="button"
                onClick={() =>
                  canGoPrev && goTo(String(allApplicants[currentIndex - 1]?._id))
                }
                disabled={!canGoPrev}
                className={`${baseButtonClass} ${secondaryButtonClass} px-2 py-1.5`}
                title="Previous applicant"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs text-gray-500 tabular-nums min-w-[3.5rem] text-center">
                {currentIndex >= 0
                  ? `${currentIndex + 1} / ${allApplicants.length}`
                  : '—'}
              </span>
              <button
                type="button"
                onClick={() =>
                  canGoNext && goTo(String(allApplicants[currentIndex + 1]?._id))
                }
                disabled={!canGoNext}
                className={`${baseButtonClass} ${secondaryButtonClass} px-2 py-1.5`}
                title="Next applicant"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: action groups */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Group 1: Edit / Save / Cancel */}
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                disabled={isSubmitting}
                className={`${baseButtonClass} ${saveButtonClass}`}
              >
                {isSubmitting ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={isSubmitting}
                className={`${baseButtonClass} ${secondaryButtonClass}`}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className={`${baseButtonClass} ${editButtonClass}`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </button>
          )}

          {/* Group 2: Status */}
          <button
            type="button"
            onClick={onChangeStatus}
            className={`${baseButtonClass} ${statusButtonClass}`}
            title="Change applicant status"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {statusLabel}
          </button>

          {/* Group 3: Schedule Interview */}
          <button
            type="button"
            onClick={onScheduleInterview}
            className={`${baseButtonClass} ${scheduleButtonClass}`}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Schedule Interview
          </button>

          {/* Group 4: Send Message */}
          <button
            type="button"
            onClick={onSendMessage}
            className={`${baseButtonClass} ${messageButtonClass}`}
          >
            <Mail className="h-3.5 w-3.5" />
            Send Message
          </button>

          {/* Dropdown: More */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={`${baseButtonClass} ${secondaryButtonClass}`}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
            >
              <MoreVertical className="h-3.5 w-3.5" />
              More
              <ChevronDown className="h-3 w-3" />
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-30 overflow-hidden"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onAddComment();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <MessageSquarePlus className="h-4 w-4 text-gray-500" />
                  Add Comment
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenInterviewSettings();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings2 className="h-4 w-4 text-gray-500" />
                  Interview Settings
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onDelete();
                  }}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Deleting…' : 'Delete applicant'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
