// ContractActions.tsx
import { JobContract } from '../../../services/contractsService';
import { useLocale } from '../../../context/LocaleContext';
import { downloadContractAsPdf } from '../../../utils/contractPdfGenerator';
import { PdfDownloadButton } from '../../../components/documents/DocumentUi';
import Swal from '../../../utils/swal';
import { getErrorMessage } from '../../../utils/errorHandler';

export function ContractActions({ contract }: { contract: JobContract }) {
  const { t } = useLocale();

  const handleDownloadPdf = async (lang: 'en' | 'ar') => {
    try {
      await downloadContractAsPdf(contract, lang);
    } catch (error) {
      Swal.fire({ title: t('error', 'common'), text: getErrorMessage(error), icon: 'error' });
    }
  };

  return (
    <PdfDownloadButton
      label={t('downloadPdf', 'jobContracts')}
      languageLabel={t('pdfLanguage', 'jobContracts')}
      englishLabel={t('english', 'jobContracts')}
      arabicLabel={t('arabic', 'jobContracts')}
      onDownload={handleDownloadPdf}
    />
  );
}
