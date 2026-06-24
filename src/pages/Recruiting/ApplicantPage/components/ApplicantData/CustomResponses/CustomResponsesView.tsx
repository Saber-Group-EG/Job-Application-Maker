// ApplicantData/CustomResponse/CustomResponsesView.tsx
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { QuestionRouter } from './QuestionItems';
import type { CustomResponsesViewProps } from '../../../../../../types/applicants';

export const CustomResponsesView: React.FC<CustomResponsesViewProps> = ({
  sections,
  expandedSectionIds,
  openDropdownId,
  onToggleSection,
  handlers,
}) => {
  return (
<div className="bg-white rounded-lg shadow-sm border border-gray-100 relative z-[100] ">

      <div className="flex flex-col">
        {sections.map((section) => {
          const isOpen = expandedSectionIds.has(section.id);
          const hasOpenDropdownInside = section.questions.some(
            (q) =>
              q.id === openDropdownId ||
              (q.type === 'group' && q.questions?.some((sq) => sq.id === openDropdownId)),
          );

          return (
            <div
              key={section.id}
              className={`relative border-b last:border-b-0 border-gray-100 ${
                hasOpenDropdownInside ? 'z-[999]' : isOpen ? 'z-20' : 'z-10'
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleSection(section.id)}
                className="w-full px-5 py-4 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-gray-800">{section.title}</h4>
                  {section.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
                  )}
                </div>
                <ChevronRight
                  className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              <div
                className={`transition-all duration-300 ease-in-out ${
                  isOpen
                    ? 'max-h-[9999px] opacity-100 overflow-visible'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="px-5 pb-5 pt-2 bg-gray-50/30">
                  {section.questions.map((question) => (
                    <QuestionRouter key={question.id} question={question} handlers={handlers} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};