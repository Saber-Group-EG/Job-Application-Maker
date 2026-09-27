import GridShape from "../../components/common/GridShape";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { useLocale } from "../../context/LocaleContext";
import { focusRing } from "../../components/ui/kit";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <>
      <PageMeta
        title={t('notFoundPageTitle', 'common')}
        description={t('notFoundPageDesc', 'common')}
      />
      <div className="relative z-1 flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-6 dark:bg-slate-950">
        <GridShape />
        <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
          <h1 className="mb-8 text-3xl font-semibold text-slate-900 dark:text-white xl:text-4xl">
            {t('404errorHeading', 'common')}
          </h1>

          <img src="/images/error/404.svg" alt="404" className="dark:hidden" />
          <img
            src="/images/error/404-dark.svg"
            alt="404"
            className="hidden dark:block"
          />

          <p className="mb-6 mt-10 text-base text-slate-600 dark:text-slate-400 sm:text-lg">
            {t('pageNotFound', 'common')}
          </p>

          <Link
            to="/"
            className={`inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 ${focusRing}`}
          >
            {t('backToHome', 'common')}
          </Link>
        </div>
        {/* <!-- Footer --> */}
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('footerCopyright', 'common', { year: new Date().getFullYear() })}
        </p>
      </div>
    </>
  );
}
