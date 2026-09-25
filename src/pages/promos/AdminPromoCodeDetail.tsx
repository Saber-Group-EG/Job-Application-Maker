import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { useLocale } from '../../context/LocaleContext';
import PageMeta from '../../components/common/PageMeta';
import { usePromoCode, usePromoRedemptions, useUsers, useUpdatePromoCode } from '../../hooks/queries';
import { formatMoney } from '../../utils/money';
import { toPlainString } from '../../utils/strings';
import Swal from '../../utils/swal';
import PromoCodeFormModal from './components/PromoCodeFormModal';
import PromoRedemptionsTable from './components/PromoRedemptionsTable';
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleDollarSign,
  Clock4,
  Pencil,
  Power,
  Receipt,
  Ticket,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CodeChip,
  EmptyState,
  PageShell,
  Pagination,
  SectionTitle,
  StatCard,
  focusRing,
} from './components/PromoUI';
import { codeState, commissionLabel, discountLabel, formatDate, isHrUser, personName } from './promoFormat';

function Term({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-end text-sm font-medium text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}

export default function AdminPromoCodeDetail() {
  const { t, locale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const isRtl = locale === 'ar';

  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: code, isLoading } = usePromoCode(id ?? null);
  const { data: users = [] } = useUsers();
  const hrUserOptions = useMemo(
    () => users.filter(isHrUser).map((u) => ({ _id: u._id, fullName: u.fullName, name: u.name, email: u.email })),
    [users]
  );

  const {
    data: redemptionsEnvelope,
    isLoading: redemptionsLoading,
    isFetching: redemptionsFetching,
  } = usePromoRedemptions({ promoCodeId: id ?? '', page: redemptionsPage });
  const redemptions = redemptionsEnvelope?.data ?? [];
  const redemptionsTotalPages = redemptionsEnvelope?.totalPages ?? 1;

  const updateMutation = useUpdatePromoCode();

  const handleToggleActive = async () => {
    if (!code) return;
    const nextActive = code.isActive === false;
    const result = await Swal.fire({
      title: nextActive ? t('detailActivateConfirmTitle', 'promos') : t('detailDeactivateConfirmTitle', 'promos'),
      text: nextActive ? t('detailActivateConfirmText', 'promos') : t('detailDeactivateConfirmText', 'promos'),
      icon: 'warning',
      showCancelButton: true,
      focusCancel: !nextActive,
      cancelButtonText: t('settleCancel', 'promos'),
      confirmButtonColor: nextActive ? '#16a34a' : '#e11d48',
      confirmButtonText: nextActive ? t('detailActivateConfirmButton', 'promos') : t('detailDeactivateConfirmButton', 'promos'),
    });
    if (!result.isConfirmed) return;
    try {
      await updateMutation.mutateAsync({ id: code._id, payload: { isActive: nextActive } });
    } catch {
      // error toast handled by the mutation hook
    }
  };

  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const back = (
    <Link
      to="/promos"
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${focusRing}`}
    >
      <BackIcon className="size-4" />
      {t('detailBackButton', 'promos')}
    </Link>
  );

  if (isLoading) {
    return (
      <PageShell back={back} title={<span className="inline-block h-7 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <StatCard key={i} label={' '} value="" loading />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!code) {
    return (
      <PageShell back={back} title={t('detailTitle', 'promos')}>
        <Card>
          <EmptyState
            icon={<Receipt className="size-6" />}
            title={t('detailNotFoundTitle', 'promos')}
            text={t('detailNotFoundText', 'promos')}
          />
        </Card>
      </PageShell>
    );
  }

  const isActive = code.isActive !== false;
  const state = codeState(code);
  const stats = code.stats;
  const owner = personName(code.ownerUserId);
  const cycles = code.discountCycles ?? 1;

  return (
    <PageShell
      back={back}
      title={
        <span className="flex flex-wrap items-center gap-3">
          <CodeChip code={toPlainString(code.code)} copyable size="lg" />
          <Badge tone={state.tone}>{t(state.labelKey, 'promos')}</Badge>
        </span>
      }
      subtitle={owner ? t('detailOwnedBy', 'promos', { name: owner }) : undefined}
      actions={
        <>
          <Button
            variant={isActive ? 'danger' : 'success'}
            icon={<Power className="size-4" />}
            loading={updateMutation.isPending}
            onClick={handleToggleActive}
          >
            {isActive ? t('detailDeactivateButton', 'promos') : t('detailActivateButton', 'promos')}
          </Button>
          <Button variant="primary" icon={<Pencil className="size-4" />} onClick={() => setIsEditModalOpen(true)}>
            {t('detailEditButton', 'promos')}
          </Button>
        </>
      }
    >
      <PageMeta title={`${toPlainString(code.code)} · ${t('detailTitle', 'promos')}`} description={t('pageSubtitle', 'promos')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('statRedemptions', 'promos')} value={stats?.redemptions ?? 0} icon={<Ticket className="size-4" />} />
        <StatCard label={t('statActiveRedemptions', 'promos')} value={stats?.activeRedemptions ?? 0} icon={<CircleCheck className="size-4" />} />
        <StatCard
          label={t('statCommissionPaid', 'promos')}
          value={formatMoney(stats?.commissionPaidCents ?? 0)}
          icon={<CircleDollarSign className="size-4" />}
        />
        <StatCard
          label={t('statCommissionPending', 'promos')}
          value={formatMoney(stats?.commissionPendingCents ?? 0)}
          icon={<Clock4 className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <SectionTitle>{t('detailTermsTitle', 'promos')}</SectionTitle>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <Term label={t('detailDiscount', 'promos')}>
              <bdi>{discountLabel(code)}</bdi>
              <span className="ms-1 font-normal text-slate-500 dark:text-slate-400">
                · {t(cycles === 1 ? 'cyclesOne' : 'cyclesMany', 'promos', { count: cycles })}
              </span>
            </Term>
            <Term label={t('detailCommission', 'promos')}>
              <bdi>{commissionLabel(code)}</bdi>
              <span className="ms-1 font-normal text-slate-500 dark:text-slate-400">· {t('perPayment', 'promos')}</span>
            </Term>
            <Term label={t('detailMaxUses', 'promos')}>
              {code.maxUses != null
                ? t('usesOfMax', 'promos', { used: stats?.redemptions ?? 0, max: code.maxUses })
                : t('detailUnlimited', 'promos')}
            </Term>
            <Term label={t('detailExpires', 'promos')}>
              {code.expiresAt ? formatDate(code.expiresAt, locale) : t('detailNever', 'promos')}
            </Term>
            <Term label={t('detailOwner', 'promos')}>{owner || '—'}</Term>
            <Term label={t('detailCreatedAt', 'promos')}>{formatDate(code.createdAt, locale)}</Term>
          </dl>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <SectionTitle>{t('detailNotes', 'promos')}</SectionTitle>
          </div>
          <div className="px-5 py-4">
            {code.notes ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {toPlainString(code.notes)}
              </p>
            ) : (
              <p className="text-sm text-slate-400">{t('detailNoNotes', 'promos')}</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <SectionTitle>{t('redemptionsTitle', 'promos')}</SectionTitle>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('resultsFound', 'promos', { count: redemptionsEnvelope?.totalCount ?? stats?.redemptions ?? 0 })}
          </span>
        </div>
        <PromoRedemptionsTable
          data={redemptions}
          isLoading={redemptionsLoading}
          isFetching={redemptionsFetching}
          showCode={false}
          emptyTitle={t('detailNoRedemptions', 'promos')}
          emptyText={t('detailNoRedemptionsText', 'promos')}
        />
        {!redemptionsLoading && redemptions.length > 0 && (
          <Pagination
            page={redemptionsPage}
            totalPages={redemptionsTotalPages}
            onChange={setRedemptionsPage}
            busy={redemptionsFetching}
          />
        )}
      </Card>

      <PromoCodeFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        mode="admin"
        code={code}
        hrUsers={hrUserOptions}
      />
    </PageShell>
  );
}
