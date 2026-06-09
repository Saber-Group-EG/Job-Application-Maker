import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  Edit3,
  Mail,
  MoreVertical,
  Printer,
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
  onPrint: () => void;
  allApplicants?: Applicant[];
};

const baseButtonClass =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const secondaryButtonClass =
  'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200';

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
  onOpenInterviewSettings,
  onDelete,
  onPrint,
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
          {/* When editing: show Save/Cancel inline */}
          {isEditing && (
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
          )}

          {/* Dropdown: More — contains Edit + all secondary actions */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={`${baseButtonClass} ${secondaryButtonClass} ${moreOpen ? 'min-w-[160px]' : 'min-w-[120px]'} justify-center`}
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
                className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-30 overflow-hidden"
              >
                {/* Edit — inside the dropdown (when not editing) */}
                {!isEditing && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 font-medium"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onChangeStatus();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <CheckSquare className="h-4 w-4 text-gray-500" />
                  Change Status
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onScheduleInterview();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <CalendarPlus className="h-4 w-4 text-gray-500" />
                  Schedule Interview
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onSendMessage();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Mail className="h-4 w-4 text-gray-500" />
                  Send Message
                </button>
                <div className="my-1 border-t border-gray-100" />
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
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false);
                    onPrint();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4 text-gray-500" />
                  Print Applicant
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
