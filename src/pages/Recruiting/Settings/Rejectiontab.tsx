import { useEffect, useMemo, useState } from "react";
import {
	ArrowRight,
	Ban,
	CircleCheckBig,
	PlusCircle,
	Save,
	ShieldCheck,
	Trash2,
	GripVertical,
} from "lucide-react";
import Swal from "../../../utils/swal";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadCrumb from "../../../components/common/PageBreadCrumb";
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
			<div className="flex items-center justify-center">
				<div
					{...attributes}
					{...listeners}
					className={`flex cursor-grab items-center justify-center rounded-lg p-2 text-slate-400 transition-all duration-200 hover:bg-slate-200 hover:text-slate-600 active:cursor-grabbing active:scale-95 dark:hover:bg-slate-700 dark:hover:text-slate-300 ${
						!canEdit ? "cursor-not-allowed opacity-50 hover:bg-transparent" : ""
					}`}
				>
					<GripVertical className="size-5" />
				</div>
			</div>

			<div>
				<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
					{t('rejectionTab.reasonLabel', 'settings', { number: index + 1 })}
				</label>
				<input
					value={reason}
					onChange={(e) => onUpdateReason(id, e.target.value)}
					disabled={!canEdit}
					placeholder={t('rejectionTab.reasonPlaceholder', 'settings')}
					className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900"
				/>
			</div>

			<div className="flex items-end">
				<button
					type="button"
					onClick={() => onRemoveReason(id)}
					disabled={!canEdit}
					className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-all duration-200 hover:bg-red-100 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
				>
					<Trash2 className="size-4" />
				</button>
			</div>
		</div>
	);
}

// Drag overlay component for smooth dragging
function DragOverlayItem({ reason, index }: { reason: string; index: number }) {
	const { t } = useLocale();
	return (
		<div className="grid grid-cols-1 gap-3 rounded-lg border border-brand-300 bg-brand-50 p-3 shadow-xl dark:border-brand-700 dark:bg-brand-900/90 md:grid-cols-[auto_1fr_auto]">
			<div className="flex items-center justify-center">
				<div className="flex cursor-grabbing items-center justify-center rounded-lg p-2 text-brand-600 dark:text-brand-400">
					<GripVertical className="size-5" />
				</div>
			</div>
			<div>
			<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
				{t('rejectionTab.dragOverlayLabel', 'settings', { number: index + 1 })}
			</label>
				<div className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-brand-700 dark:bg-brand-900/50 dark:text-slate-300">
					{reason || t('rejectionTab.dragOverlayEmpty', 'settings')}
				</div>
			</div>
			<div className="flex items-end">
				<div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-400 opacity-50 dark:bg-red-500/10">
					<Trash2 className="size-4" />
				</div>
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
		return (
			<div className={embedded ? "" : "min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950"}>
				<div className={`${embedded ? "" : "mx-auto max-w-lg"} rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900`}>
					<div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
						<ShieldCheck className="size-8" />
					</div>
				<h2 className="text-2xl font-bold tracking-tight">{t('rejectionTab.noPermissionTitle', 'settings')}</h2>
				<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
					{t('rejectionTab.noPermissionDesc', 'settings')}
				</p>
				</div>
			</div>
		);
	}

	return (
		<div className={embedded ? "space-y-6" : "min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-8"}>
			{!embedded && (
				<>
				<PageMeta
					title={t('rejectionTab.pageMetaTitle', 'settings')}
					description={t('rejectionTab.pageMetaDesc', 'settings')}
				/>
				<PageBreadCrumb pageTitle={t('rejectionTab.pageBreadcrumb', 'settings')} />
				</>
			)}

			<div className={embedded ? "space-y-6" : "mx-auto max-w-7xl space-y-6"}>
				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
					<div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
						<div className="flex items-start gap-4">
							<div className="flex size-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
								<Ban className="size-6" />
							</div>
							<div>
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600/80 dark:text-rose-300">
								{t('rejectionTab.sectionSubtitle', 'settings')}
							</p>
							<h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
								{t('rejectionTab.title', 'settings')}
							</h1>
							<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
								{t('rejectionTab.description', 'settings')}
							</p>
							</div>
						</div>

						<button
							onClick={handleSave}
							disabled={isSaving || isLoading || !canEdit}
							className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isSaving ? (
								<div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
							) : (
								<Save className="size-4" />
							)}
							{t('rejectionTab.saveReasons', 'settings')}
							<ArrowRight className="size-4" />
						</button>
					</div>

					<div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
						<div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
							<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
								{t('rejectionTab.statCompany', 'settings')}
							</p>
							<p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
								{getCompanyName(selectedCompany, t, locale)}
							</p>
						</div>

						<div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
							<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
								{t('rejectionTab.statTotalReasons', 'settings')}
							</p>
							<p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
								{rejectReasons.length}
							</p>
						</div>

						<div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
							<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
								{t('rejectionTab.statSaveStatus', 'settings')}
							</p>
							<p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
								<CircleCheckBig className="size-4" /> {t('rejectionTab.statReady', 'settings')}
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
						<div className="xl:col-span-12">
						<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
							<div className="flex flex-col gap-3 border-b border-slate-200 p-6 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
								<div className="flex items-center gap-3">
									<div className="flex size-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
										<Ban className="size-6" />
									</div>
									<div>
								<h2 className="text-xl font-semibold tracking-tight">{t('rejectionTab.reasonLibraryTitle', 'settings')}</h2>
								<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
									{t('rejectionTab.reasonLibraryDesc', 'settings')}
								</p>
									</div>
								</div>

								<button
									type="button"
									onClick={addReason}
									disabled={!canEdit}
									className="inline-flex items-center gap-2 self-start rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
								>
									<PlusCircle className="size-4" /> {t('rejectionTab.addReason', 'settings')}
								</button>
							</div>

							<div className="space-y-4 p-6">
								{isLoading && (
									<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
										{t('rejectionTab.loading', 'settings')}
									</div>
								)}

								{!isLoading && rejectReasons.length === 0 && (
									<div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
										<Ban className="mx-auto mb-3 size-10 text-slate-300 dark:text-slate-600" />
										<p className="text-sm font-medium text-slate-500 dark:text-slate-400">
											{t('rejectionTab.emptyState', 'settings')}
										</p>
									</div>
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
											<div className="space-y-3">
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
										
										{/* Drag overlay for smooth dragging */}
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
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}