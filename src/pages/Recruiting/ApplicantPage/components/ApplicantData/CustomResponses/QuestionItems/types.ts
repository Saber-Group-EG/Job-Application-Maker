// Components/QuestionItems/types.ts
import React from 'react';

export interface QuestionHandlers {
  isEditable: boolean;
  openDropdownId: string | null;
  expandedGroupIds: Set<string>;
  dropdownRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onToggleDropdown: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onTextChange: (id: string, value: string) => void;
  onUrlChange: (id: string, value: string) => void;
  onNumberChange: (id: string, value: number) => void;
  onEmailChange: (id: string, value: string) => void;
  onDateChange: (id: string, value: string) => void;
  onCheckboxChange: (id: string, checked: boolean) => void;
  onRadioChange: (id: string, value: string) => void;
  onDropdownSelect: (id: string, value: string) => void;
  onTextareaChange: (id: string, value: string) => void;
  onTagsChange: (id: string, values: string[]) => void;
}