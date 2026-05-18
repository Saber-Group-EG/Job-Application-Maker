import { CustomResponsesView } from './customResponses/CustomResponsesView';
import { useCustomResponses } from './customResponses/useCustomResponses';
import type { ApplicantWithCustomResponses, CustomFieldLike } from '../../../../types/applicants';

type Props = {
  applicant: ApplicantWithCustomResponses;
  customFields?: CustomFieldLike[];
};

export default function CustomResponses({ applicant, customFields }: Props) {
  const {
    customResponseEntries,
    expandedTextByKey,
    isGroupFieldExpanded,
    isSectionItemExpanded,
    toggleGroupField,
    toggleSectionItem,
    toggleText,
  } = useCustomResponses({ applicant, customFields });

  if (customResponseEntries.length === 0) return null;

  return (
    <CustomResponsesView
      entries={customResponseEntries}
      expandedTextByKey={expandedTextByKey}
      onToggleText={toggleText}
      isSectionItemExpanded={isSectionItemExpanded}
      onToggleSectionItem={toggleSectionItem}
      isGroupFieldExpanded={isGroupFieldExpanded}
      onToggleGroupField={toggleGroupField}
    />
  );
}
