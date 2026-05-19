// Components/QuestionItems/UrlItem.tsx
import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { UrlQuestion } from '../../../../../../../types/applicants';
import type { QuestionHandlers } from './types';

export const UrlItem: React.FC<{ 
  question: UrlQuestion; 
  handlers: Pick<QuestionHandlers, 'isEditable' | 'onUrlChange'>;
}> = ({ question, handlers }) => (
  <div className="mb-4 last:mb-0">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {question.text}
      {question.required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="flex items-center gap-2">
      <input
        type="url"
        value={question.value ?? ''}
        onChange={(e) => handlers.isEditable && handlers.onUrlChange(question.id, e.target.value)}
        placeholder={question.placeholder}
        readOnly={!handlers.isEditable}
        className={`flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none ${
          handlers.isEditable
            ? 'focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white cursor-text'
            : 'bg-gray-50 cursor-not-allowed opacity-75'
        }`}
      />
      {question.value && (
        <a href={question.value} target="_blank" rel="noopener noreferrer"
          className="p-2 text-blue-600 hover:text-blue-700 transition-colors">
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  </div>
);