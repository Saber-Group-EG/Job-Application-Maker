import { useEffect, useMemo, useState } from "react";
import {
	Ban,
	Loader2,
	CircleCheckBig,
	PlusCircle,
	Save,
	ShieldCheck,
	Trash2,
	GripVertical,
} from "lucide-react";
import Swal from "../../../utils/swal";
import {
	Button,
	Card,
	CardToolbar,
	EmptyState,
	IconButton,
	NoAccess,
	SectionTitle,
	focusRing,
	inputClass,
} from "../../../components/ui/kit";
import SettingsSection from "./components/SettingsSection";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../context/LocaleContext";
import {
	useCompanies,
	useUpdateCompanyRejectionReasons,
} from "../../../hooks/queries/useCompanies";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	DragStartEvent,
	DragOverlay,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import { useCompanyFilter } from '../../../context/CompanyFilterContext';

type Props = {
	companyId?: string;
	onSaved?: (rejectReasons: string[]) => void;
	onChange?: (rejectReasons: string[]) => void;
	embedded?: boolean;
};

type CompanyShape = {
	_id: string;
	name?: string | { en?: string; ar?: string };
	rejectReasons?: string[];
	settings?: {
		_id?: string;
		company?: string;
		rejectReasons?: string[];
	};
};

type ReasonItem = {
	id: string;
	value: string;
};

const normalizeRejectReasons = (reasons: unknown): string[] => {
	if (!Array.isArray(reasons)) return [];

	return reasons
		.map((reason) => String(reason ?? "").trim())
		.filter(Boolean);
};

const getCompanyName = (company: CompanyShape | undefined, t: (key: string, ns: string) => string, locale?: string): string => {
	if (!company) return t('rejectionTab.noCompany', 'settings');
	if (typeof company.name === "string") return company.name;
	if (locale === 'ar') return company.name?.ar || company.name?.en || t('rejectionTab.unnamedCompany', 'settings');
	return company.name?.en || company.name?.ar || t('rejectionTab.unnamedCompany', 'settings');
};

// Sortable Item Component with smooth animations
function SortableReasonItem({
	id,
	index,
	reason,
	canEdit,
	onUpdateReason,
	onRemoveReason,
	isDragging = false,
}: {
	id: string;
	index: number;
	reason: string;
	canEdit: boolean;
	onUpdateReason: (id: string, value: string) => void;
	onRemoveReason: (id: string) => void;
	isDragging?: boolean;
}) {
	const { t } = useLocale();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging: isSortableDragging,
	} = useSortable({ 
		id,
		animateLayoutChanges: () => false, // Prevents layout shift animation conflicts
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition: transition || "transform 200ms ease, opacity 200ms ease",
		opacity: isSortableDragging || isDragging ? 0.5 : 1,
		willChange: "transform",
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`group grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition-all duration-200 dark:border-slate-700 dark:bg-slate-800/60 md:grid-cols-[auto_1fr_auto] ${
				isSortableDragging || isDragging
					? "shadow-lg ring-2 ring-brand-500 ring-opacity-50 scale-[1.02] z-50"
					: "hover:shadow-md hover:border-brand-200 dark:hover:border-brand-700"
			}`}
		>
			<div
				{...attributes}
				{...listeners}
				className={`flex cursor-grab touch-none items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-300 ${focusRing} ${
					!canEdit ? "cursor-not-allowed opacity-50 hover:bg-transparent" : ""
				}`}
			>
				<GripVertical className="size-4" />
			</div>
			<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
				{index + 1}
			</span>
			<input
				value={reason}
				onChange={(e) => onUpdateReason(id, e.target.value)}
				disabled={!canEdit}
				aria-label={t('rejectionTab.reasonLabel', 'settings', { number: index + 1 })}
				placeholder={t('rejectionTab.reasonPlaceholder', 'settings')}
				className={inputClass}
			/>
			<IconButton
				tone="danger"
				label={t('delete', 'common')}
				onClick={() => onRemoveReason(id)}
				disabled={!canEdit}
			>
				<Trash2 className="size-4" />
			</IconButton>
		</div>
	);
}

// Drag overlay component for smooth dragging
function DragOverlayItem({ reason, index }: { reason: string; index: number }) {
	const { t } = useLocale();
	return (
		<div className="flex items-center gap-2 rounded-xl border border-brand-400 bg-white p-2 shadow-xl dark:bg-slate-900">
			<div className="flex cursor-grabbing items-center justify-center rounded-lg p-1.5 text-brand-500">
				<GripVertical className="size-4" />
			</div>
			<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
				{index + 1}
			</span>
			<div className="min-w-0 flex-1 truncate px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
				{reason || t('rejectionTab.dragOverlayEmpty', 'settings')}
			</div>
		</div>
	);
}

export default function RejectionTab({
	companyId: _companyId,
	onSaved,
	onChange,
	embedded = false,
}: Props) {
	const { hasPermission } = useAuth();
	const { t, locale } = useLocale();
	const { data: companies = [], isLoading: isCompaniesLoading } = useCompanies();

	const { selectedCompanyId } = useCompanyFilter();

	const canRead =
		hasPermission("Company Management", "read") ||
		hasPermission("Settings Management", "read");
	const canEdit =
		hasPermission("Company Management", "write") ||
		hasPermission("Settings Management", "write") ||
		hasPermission("Settings Management", "create");
	const [rejectReasons, setRejectReasons] = useState<ReasonItem[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [activeId, setActiveId] = useState<string | null>(null);

	const effectiveCompanyId = selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;
	const selectedCompany = useMemo(
		() => (companies as CompanyShape[]).find((company) => company._id === effectiveCompanyId),
		[companies, effectiveCompanyId]
	);

	const updateRejectionReasonsMutation = useUpdateCompanyRejectionReasons();

	// Get rejection reasons directly from the selected company (from /auth/me data)
	const derivedRejectReasons = useMemo(() => {
		// Try to get from settings first, then from root
		const fromSettings = normalizeRejectReasons(selectedCompany?.settings?.rejectReasons);
		if (fromSettings.length > 0) return fromSettings;

		const fromRoot = normalizeRejectReasons(selectedCompany?.rejectReasons);
		if (fromRoot.length > 0) return fromRoot;

		return [];
	}, [selectedCompany]);

	const isLoading = isCompaniesLoading;

	useEffect(() => {
		setRejectReasons(derivedRejectReasons.map((value) => ({
			id: crypto.randomUUID(),
			value,
		})));
	}, [derivedRejectReasons]);

	useEffect(() => {
		onChange?.(rejectReasons.map(r => r.value));
	}, [onChange, rejectReasons]);

	const addReason = () => {
		setRejectReasons((prev) => [...prev, { id: crypto.randomUUID(), value: "" }]);
	};

	const updateReason = (id: string, value: string) => {
		setRejectReasons((prev) => prev.map((reason) => (reason.id === id ? { ...reason, value } : reason)));
	};

	const removeReason = (id: string) => {
		setRejectReasons((prev) => prev.filter((reason) => reason.id !== id));
	};

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);
		
		if (over && active.id !== over.id) {
			setRejectReasons((items) => {
				const oldIndex = items.findIndex((item) => item.id === active.id);
				const newIndex = items.findIndex((item) => item.id === over.id);
				
				if (oldIndex !== -1 && newIndex !== -1) {
					return arrayMove(items, oldIndex, newIndex);
				}
				return items;
			});
		}
	};

	const handleDragCancel = () => {
		setActiveId(null);
	};

	const handleSave = async () => {
		if (!selectedCompanyId) {
			Swal.fire(t('rejectionTab.validationSelectCompany', 'settings'), t('rejectionTab.validationSelectCompany', 'settings'), 'warning');
			return;
		}

		const payload = normalizeRejectReasons(rejectReasons.map(r => r.value));
		
		// Get the settings ID from the selected company
		const settingsId = selectedCompany?.settings?._id;
		
		setIsSaving(true);
		try {
			await updateRejectionReasonsMutation.mutateAsync({
				settingsId: settingsId || '',  // Only settingsId
				rejectReasons: payload,  // Array of strings      
			});

			Swal.fire({
				title: t('rejectionTab.swalSaved', 'settings'),
				icon: 'success',
				timer: 1200,
				showConfirmButton: false,
			});

			onSaved?.(payload);
		} catch (error: any) {
			Swal.fire(
				t('rejectionTab.swalSaveFailed', 'settings'),
				error?.message || t('rejectionTab.swalSaveFailedMsg', 'settings'),
				'error'
			);
		} finally {
			setIsSaving(false);
		}
	};

	// Get the active dragging item data
	const activeItem = activeId ? rejectReasons.find((item) => item.id === activeId) : null;

	// Set up sensors for drag and drop with improved sensitivity
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Reduced distance for faster response
				delay: 0,
				tolerance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	if (!canRead) {
		if (embedded) {
			return (
				<Card>
					<EmptyState
						icon={<ShieldCheck className="size-6" />}
						title={t('rejectionTab.noPermissionTitle', 'settings')}
						text={t('rejectionTab.noPermissionDesc', 'settings')}
					/>
				</Card>
			);
		}
		return <NoAccess title={t('rejectionTab.noPermissionTitle', 'settings')} text={t('rejectionTab.noPermissionDesc', 'settings')} />;
	}

	return (
		<SettingsSection
			embedded={embedded}
			metaTitle={t('rejectionTab.pageMetaTitle', 'settings')}
			metaDescription={t('rejectionTab.pageMetaDesc', 'settings')}
			icon={<Ban className="size-4" />}
			title={t('rejectionTab.title', 'settings')}
			description={t('rejectionTab.description', 'settings')}
			actions={
				<Button
					variant="primary"
					icon={<Save className="size-4" />}
					loading={isSaving}
					disabled={isLoading || !canEdit}
					onClick={handleSave}
				>
					{t('rejectionTab.saveReasons', 'settings')}
				</Button>
			}
			stats={[
				{ label: t('rejectionTab.statCompany', 'settings'), value: getCompanyName(selectedCompany, t, locale) },
				{ label: t('rejectionTab.statTotalReasons', 'settings'), value: rejectReasons.length },
				{
					label: t('rejectionTab.statSaveStatus', 'settings'),
					value: (
						<>
							<CircleCheckBig className="size-4" /> {t('rejectionTab.statReady', 'settings')}
						</>
					),
					tone: 'success',
				},
			]}
		>
			<Card>
				<CardToolbar>
					<div>
						<SectionTitle icon={<Ban className="size-4" />}>{t('rejectionTab.reasonLibraryTitle', 'settings')}</SectionTitle>
						<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('rejectionTab.reasonLibraryDesc', 'settings')}</p>
					</div>
					<Button icon={<PlusCircle className="size-4" />} onClick={addReason} disabled={!canEdit}>
						{t('rejectionTab.addReason', 'settings')}
					</Button>
				</CardToolbar>

				<div className="p-4">
					{isLoading && (
						<div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" role="status">
							<Loader2 className="size-4 animate-spin" />
							{t('rejectionTab.loading', 'settings')}
						</div>
					)}

					{!isLoading && rejectReasons.length === 0 && (
						<EmptyState icon={<Ban className="size-6" />} title={t('rejectionTab.emptyState', 'settings')} />
					)}

					{!isLoading && rejectReasons.length > 0 && (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
							onDragCancel={handleDragCancel}
						>
							<SortableContext
								items={rejectReasons.map((item) => item.id)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-2">
									{rejectReasons.map((item, index) => (
										<SortableReasonItem
											key={item.id}
											id={item.id}
											index={index}
											reason={item.value}
											canEdit={canEdit}
											onUpdateReason={updateReason}
											onRemoveReason={removeReason}
											isDragging={activeId === item.id}
										/>
									))}
								</div>
							</SortableContext>

							{createPortal(
								<DragOverlay>
									{activeId && activeItem ? (
										<DragOverlayItem
											reason={activeItem.value}
											index={rejectReasons.findIndex((item) => item.id === activeId)}
										/>
									) : null}
								</DragOverlay>,
								document.body
							)}
						</DndContext>
					)}
				</div>
			</Card>
		</SettingsSection>
	);
}
