// Components/QuestionItems/TextItem.tsx
import React from 'react';
import type { TextQuestion } from '../../../../../../../types/applicants';
import type { QuestionHandlers } from './types';
import { renderSmartText } from '../../../../../../../components/common/SmartText';

export const TextItem: React.FC<{ 
  question: TextQuestion; 
  handlers: Pick<QuestionHandlers, 'isEditable' | 'onTextChange'>;
}> = ({ question, handlers }) => (
  <div className="mb-4 last:mb-0">
    {question.text.toLowerCase() !== 'answer' && (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {question.text}
      {question.required && <span className="text-red-500 ml-1">*</span>}
    </label>)}
    {handlers.isEditable ? (
    <input
      type="text"
      value={question.value ?? ''}
      onChange={(e) => handlers.isEditable && handlers.onTextChange(question.id, e.target.value)}
      placeholder={question.placeholder}
      readOnly={!handlers.isEditable}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white cursor-text"
    />
    ) : (
    <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 opacity-75 break-words">
      {renderSmartText(question.value, { preserveNewlines: true }).node}
    </div>
    )}
  </div>
);