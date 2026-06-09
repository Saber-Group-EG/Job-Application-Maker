// Components/QuestionItems/CheckboxItem.tsx
import React from 'react';
import type { CheckboxQuestion } from '../../../../../../../types/applicants';
import type { QuestionHandlers } from './types';

export const CheckboxItem: React.FC<{ 
  question: CheckboxQuestion; 
  handlers: Pick<QuestionHandlers, 'isEditable' | 'onCheckboxChange'>;
}> = ({ question, handlers }) => (
  <div className="mb-3 last:mb-0">
    <label className={`flex items-center gap-2 ${handlers.isEditable ? 'cursor-pointer' : 'cursor-default opacity-75'}`}>
      <input
        type="checkbox"
        checked={question.checked ?? false}
        onChange={(e) => handlers.isEditable && handlers.onCheckboxChange(question.id, e.target.checked)}
        disabled={!handlers.isEditable}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">{(question.label ?? question.text).toLowerCase() !== 'answer' ? (question.label ?? question.text) : ''}</span>
      {question.required && <span className="text-red-500 text-xs ml-1">*</span>}
    </label>
  </div>
);