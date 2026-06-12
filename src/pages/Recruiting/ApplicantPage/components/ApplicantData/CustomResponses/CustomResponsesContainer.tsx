// ApplicantData/CustomResponse/CustomResponsesContainer.tsx
import React from 'react';
import { useCustomResponses } from './Usecustomresponses';
import { CustomResponsesView } from './CustomResponsesView';
import type { QuestionHandlers } from './QuestionItems';
import type { CustomResponsesContainerProps } from '../../../../../../types/applicants';

export const CustomResponsesContainer: React.FC<CustomResponsesContainerProps> = ({
  isEditable = false,
  sections,
  onSectionsChange,
}) => {
  const {
    sections: responseSections,
    expandedSectionIds,
    expandedGroupIds,
    openDropdownId,
    dropdownRefs,
    toggleSection,
    toggleGroup,
    toggleDropdown,
    updateTextValue,
    updateUrlValue,
    updateNumberValue,
    updateEmailValue,
    updateDateValue,
    updateCheckbox,
    updateRadio,
    updateDropdown,
    updateTextarea,
    updateTags,
  } = useCustomResponses({ sections, onSectionsChange });

  const handlers: QuestionHandlers = {
    isEditable,
    openDropdownId,
    expandedGroupIds,
    dropdownRefs,
    onToggleDropdown: toggleDropdown,
    onToggleGroup: toggleGroup,
    onTextChange: updateTextValue,
    onUrlChange: updateUrlValue,
    onNumberChange: updateNumberValue,
    onEmailChange: updateEmailValue,
    onDateChange: updateDateValue,
    onCheckboxChange: updateCheckbox,
    onRadioChange: updateRadio,
    onDropdownSelect: updateDropdown,
    onTextareaChange: updateTextarea,
    onTagsChange: updateTags,
  };

  return (
    <CustomResponsesView
      sections={responseSections}
      expandedSectionIds={expandedSectionIds}
      openDropdownId={openDropdownId}
      onToggleSection={toggleSection}
      handlers={handlers}
    />
  );
};

export default CustomResponsesContainer;