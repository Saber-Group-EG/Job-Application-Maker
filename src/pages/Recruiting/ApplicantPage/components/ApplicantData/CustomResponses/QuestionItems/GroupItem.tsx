// Components/QuestionItems/GroupItem.tsx
import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { GroupQuestion } from '../../../../../../../types/applicants';
import type { QuestionHandlers } from './types';
import { QuestionRouter } from './QuestionRouter';

export const GroupItem: React.FC<{ 
  question: GroupQuestion; 
  handlers: QuestionHandlers;
}> = ({ question, handlers }) => {
  const isExpanded = handlers.expandedGroupIds.has(question.groupId);
  
  return (
    <div className="mb-4 border border-gray-100 rounded-lg">
      <button
        type="button"
        onClick={() => handlers.onToggleGroup(question.groupId)}
        className="w-full bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors rounded-t-lg"
      >
        <div className="text-left">
          <h4 className="text-sm font-semibold text-gray-800">{question.groupName}</h4>
          <p className="text-xs text-gray-500">{question.text}</p>
        </div>
        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[9999px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-4">
          {question.questions.map((sq) => (
            <QuestionRouter key={sq.id} question={sq} handlers={handlers} isSubQuestion />
          ))}
        </div>
      </div>
    </div>
  );
};