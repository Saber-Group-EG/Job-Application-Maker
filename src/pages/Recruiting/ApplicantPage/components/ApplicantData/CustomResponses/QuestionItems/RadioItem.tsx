// Components/QuestionItems/RadioItem.tsx
import React from 'react';
import type { RadioQuestion } from '../../../../../../../types/applicants';
import type { QuestionHandlers } from './types';

export const RadioItem: React.FC<{ 
  question: RadioQuestion; 
  handlers: Pick<QuestionHandlers, 'isEditable' | 'onRadioChange'>;
}> = ({ question, handlers }) => (
  <div className="mb-4 last:mb-0">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {question.text}
      {question.required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="flex flex-col gap-1.5">
      {question.options.map((option) => (
        <label
          key={option}
          className={`flex items-center gap-2 ${handlers.isEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
        >
          <input
            type="radio"
            name={question.id}
            value={option}
            checked={question.selectedValue === option}
            onChange={() => handlers.isEditable && handlers.onRadioChange(question.id, option)}
            disabled={!handlers.isEditable}
            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{option}</span>
        </label>
      ))}
    </div>
  </div>
);