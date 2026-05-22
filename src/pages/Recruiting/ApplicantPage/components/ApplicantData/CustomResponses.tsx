// ApplicantData/CustomResponses.tsx
import React from 'react';
import { CustomResponsesContainer } from './CustomResponses/CustomResponsesContainer';

interface CustomResponsesProps {
  isEditable?: boolean;
}

/**
 * Main CustomResponses component
 * Uses the Container pattern by default
 * For advanced use cases, you can import CustomResponsesView directly
 */
const CustomResponses: React.FC<CustomResponsesProps> = ({ isEditable = false }) => {
  return <CustomResponsesContainer isEditable={isEditable} />;
};

export default CustomResponses;

