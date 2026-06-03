// ApplicantData/CustomResponses.tsx
import React from 'react';
import { CustomResponsesContainer } from './CustomResponses/CustomResponsesContainer';
import type { CustomResponsesProps } from '../../../../../types/applicants';

/**
 * Main CustomResponses component
 * Uses the Container pattern by default
 * For advanced use cases, you can import CustomResponsesView directly
 */
const CustomResponses: React.FC<CustomResponsesProps> = ({
  isEditable = false,
  sections = [],
  onSectionsChange,
}) => {
  if (sections.length === 0) return null;
  return (
    <CustomResponsesContainer
      isEditable={isEditable}
      sections={sections}
      onSectionsChange={onSectionsChange}
    />
  );
};

export default CustomResponses;
