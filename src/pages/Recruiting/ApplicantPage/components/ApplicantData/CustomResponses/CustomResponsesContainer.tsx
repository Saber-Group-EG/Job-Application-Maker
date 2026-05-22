// ApplicantData/CustomResponse/CustomResponsesContainer.tsx
import React from 'react';
import { useCustomResponses } from './Usecustomresponses';
import { CustomResponsesView } from './CustomResponsesView';
import type { QuestionHandlers } from './QuestionItems';

interface CustomResponsesContainerProps {
  isEditable?: boolean;
}

export const CustomResponsesContainer: React.FC<CustomResponsesContainerProps> = ({ 
  isEditable = false 
}) => {
  const {
    sections,
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
  } = useCustomResponses();

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
      sections={sections}
      expandedSectionIds={expandedSectionIds}
      openDropdownId={openDropdownId}
      onToggleSection={toggleSection}
      handlers={handlers}
    />
  );
};

export default CustomResponsesContainer;