// Components/QuestionItems/EmailItem.tsx
import React from 'react';
import type { EmailQuestion } from '../../../../../../../types/applicants';
import type { QuestionHandlers } from './types';

export const EmailItem: React.FC<{ 
  question: EmailQuestion; 
  handlers: Pick<QuestionHandlers, 'isEditable' | 'onEmailChange'>;
}> = ({ question, handlers }) => (
  <div className="mb-4 last:mb-0">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {question.text}
      {question.required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type="email"
      value={question.value ?? ''}
      onChange={(e) => handlers.isEditable && handlers.onEmailChange(question.id, e.target.value)}
      placeholder={question.placeholder}
      readOnly={!handlers.isEditable}
      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none ${
        handlers.isEditable
          ? 'focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white cursor-text'
          : 'bg-gray-50 cursor-not-allowed opacity-75'
      }`}
    />
  </div>
);