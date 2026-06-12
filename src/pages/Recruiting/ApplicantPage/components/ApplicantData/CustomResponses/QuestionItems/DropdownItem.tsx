// Components/QuestionItems/DropdownItem.tsx
import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { DropdownQuestion } from '../../../../../../../types/applicants';
import type { QuestionHandlers } from './types';

export const DropdownItem: React.FC<{ 
  question: DropdownQuestion; 
  handlers: Pick<QuestionHandlers, 'isEditable' | 'openDropdownId' | 'dropdownRefs' | 'onToggleDropdown' | 'onDropdownSelect'>;
}> = ({ question, handlers }) => {
  const isOpen = handlers.openDropdownId === question.id;
  
  return (
    <div
      className="mb-4 last:mb-0 relative"
      ref={(el) => {
        if (el) handlers.dropdownRefs.current.set(question.id, el);
        else handlers.dropdownRefs.current.delete(question.id);
      }}
    >
      {question.text.toLowerCase() !== 'answer' && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {question.text}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </label>)}
      <button
        type="button"
        onClick={() => handlers.isEditable && handlers.onToggleDropdown(question.id)}
        disabled={!handlers.isEditable}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg transition-all duration-200 focus:outline-none ${
          handlers.isEditable
            ? 'bg-white hover:border-gray-300 hover:bg-gray-50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 cursor-pointer'
            : 'bg-gray-50 cursor-default opacity-75'
        }`}
      >
        <span className={question.selectedValue ? 'text-gray-700' : 'text-gray-400'}>
          {question.selectedValue ?? 'Select an option'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {handlers.isEditable && isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="py-1 max-h-60 overflow-auto">
            {question.options.map((option, index) => (
              <button
                key={option}
                type="button"
                onClick={() => handlers.onDropdownSelect(question.id, option)}
                className={`
                  w-full text-left px-4 py-2.5 text-sm transition-colors duration-150
                  flex items-center justify-between
                  ${index !== question.options.length - 1 ? 'border-b border-gray-50' : ''}
                  ${question.selectedValue === option ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
                `}
              >
                <span className="flex-1">{option}</span>
                {question.selectedValue === option && (
                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};