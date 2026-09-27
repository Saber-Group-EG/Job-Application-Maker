// ContractActions.tsx
import { JobContract } from '../../../services/contractsService';
import { useLocale } from '../../../context/LocaleContext';
import { downloadContractAsPdf } from '../../../utils/contractPdfGenerator';
import { PdfDownloadButton } from '../../../components/documents/DocumentUi';

export function ContractActions({ contract }: { contract: JobContract }) {
  const { t } = useLocale();

  const handleDownloadPdf = async (lang: 'en' | 'ar') => {
    try {
      await downloadContractAsPdf(contract, lang);
    } catch (error) {
      console.error('Failed to download PDF:', error);
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
