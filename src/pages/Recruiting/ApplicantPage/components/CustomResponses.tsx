import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ExternalLink, Check, ChevronRight } from 'lucide-react';

interface BaseQuestion {
  id: string;
  text: string;
  type: 'text' | 'url' | 'checkbox' | 'dropdown' | 'group';
  required?: boolean;
}

interface TextQuestion extends BaseQuestion {
  type: 'text';
  value?: string;
  placeholder?: string;
}

interface UrlQuestion extends BaseQuestion {
  type: 'url';
  value?: string;
  placeholder?: string;
}

interface CheckboxQuestion extends BaseQuestion {
  type: 'checkbox';
  checked?: boolean;
  label?: string;
}

interface DropdownQuestion extends BaseQuestion {
  type: 'dropdown';
  options: string[];
  selectedValue?: string;
}

interface GroupQuestion extends BaseQuestion {
  type: 'group';
  groupId: string;
  groupName: string;
  questions: (TextQuestion | UrlQuestion | CheckboxQuestion | DropdownQuestion)[];
}

type Question = TextQuestion | UrlQuestion | CheckboxQuestion | DropdownQuestion | GroupQuestion;

interface ResponseSection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

const CustomResponses: React.FC<{ isEditable?: boolean }> = ({ isEditable = false }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['personal_info', 'skills', 'experience']));
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const [sections, setSections] = useState<ResponseSection[]>([
    {
      id: 'personal_info',
      title: 'Personal Information',
      description: 'Basic personal and contact details',
      questions: [
        {
          id: '1',
          type: 'text',
          text: 'What is your current notice period?',
          value: '2 weeks',
          placeholder: 'e.g., Immediate, 2 weeks, 1 month',
          required: true,
        },
        {
          id: '2',
          type: 'url',
          text: 'Link to your portfolio / GitHub',
          value: 'https://github.com/johndoe',
          placeholder: 'https://...',
          required: true,
        },
        {
          id: '3',
          type: 'checkbox',
          text: 'Are you legally authorized to work in this country?',
          checked: true,
          label: 'Yes, I am authorized to work',
          required: true,
        },
        {
          id: '4',
          type: 'dropdown',
          text: 'What is your expected salary range?',
          options: ['$50,000 - $70,000', '$70,000 - $90,000', '$90,000 - $110,000', '$110,000 - $130,000', '$130,000+'],
          selectedValue: '$90,000 - $110,000',
          required: true,
        },
      ],
    },
    {
      id: 'skills',
      title: 'Technical Skills Assessment',
      description: 'Technical expertise and development experience',
      questions: [
        {
          id: '5a',
          type: 'text',
          text: 'Years of React experience',
          value: '5+ years',
          placeholder: 'e.g., 2 years',
        },
        {
          id: '5b',
          type: 'url',
          text: 'GitHub repository with React projects',
          value: 'https://github.com/johndoe/react-projects',
          placeholder: 'GitHub URL',
        },
        {
          id: '5c',
          type: 'checkbox',
          text: 'Experience with Next.js',
          checked: true,
          label: 'I have experience with Next.js',
        },
        {
          id: '5d',
          type: 'dropdown',
          text: 'Preferred testing framework',
          options: ['Jest', 'React Testing Library', 'Cypress', 'Playwright', 'None'],
          selectedValue: 'Jest',
        },
        {
          id: '5e',
          type: 'checkbox',
          text: 'TypeScript proficiency',
          checked: true,
          label: 'I am proficient in TypeScript',
        },
      ],
    },
    {
      id: 'experience',
      title: 'Soft Skills & Experience',
      description: 'Leadership, communication, and work preferences',
      questions: [
        {
          id: '6a',
          type: 'text',
          text: 'How many years of team lead experience?',
          value: '2 years',
          placeholder: 'e.g., 3 years',
        },
        {
          id: '6b',
          type: 'checkbox',
          text: 'Remote work experience',
          checked: true,
          label: 'I have worked remotely',
        },
        {
          id: '6c',
          type: 'checkbox',
          text: 'Available for occasional travel',
          checked: false,
          label: 'Yes, I can travel occasionally',
        },
        {
          id: '6d',
          type: 'text',
          text: 'Tell us about your biggest achievement',
          value: 'Led a team of 5 to deliver a major feature ahead of schedule',
          placeholder: 'Describe your achievement...',
        },
      ],
    },
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen) {
        const currentRef = dropdownRefs.current.get(dropdownOpen);
        if (currentRef && !currentRef.contains(event.target as Node)) {
          setDropdownOpen(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const updateTextValue = (id: string, value: string) => {
    setSections(prev => prev.map(section => ({
      ...section,
      questions: section.questions.map(q => {
        if (q.id === id && q.type === 'text') {
          return { ...q, value };
        }
        if (q.type === 'group') {
          return {
            ...q,
            questions: q.questions.map(sq => {
              if (sq.id === id && (sq.type === 'text' || sq.type === 'url')) {
                return { ...sq, value };
              }
              return sq;
            }),
          };
        }
        return q;
      }),
    })));
  };

  const updateUrlValue = (id: string, value: string) => {
    setSections(prev => prev.map(section => ({
      ...section,
      questions: section.questions.map(q => {
        if (q.id === id && q.type === 'url') {
          return { ...q, value };
        }
        if (q.type === 'group') {
          return {
            ...q,
            questions: q.questions.map(sq => {
              if (sq.id === id && sq.type === 'url') {
                return { ...sq, value };
              }
              return sq;
            }),
          };
        }
        return q;
      }),
    })));
  };

  const updateCheckbox = (id: string, checked: boolean) => {
    setSections(prev => prev.map(section => ({
      ...section,
      questions: section.questions.map(q => {
        if (q.id === id && q.type === 'checkbox') {
          return { ...q, checked };
        }
        if (q.type === 'group') {
          return {
            ...q,
            questions: q.questions.map(sq => {
              if (sq.id === id && sq.type === 'checkbox') {
                return { ...sq, checked };
              }
              return sq;
            }),
          };
        }
        return q;
      }),
    })));
  };

  const updateDropdown = (id: string, selectedValue: string) => {
    setSections(prev => prev.map(section => ({
      ...section,
      questions: section.questions.map(q => {
        if (q.id === id && q.type === 'dropdown') {
          setDropdownOpen(null);
          return { ...q, selectedValue };
        }
        if (q.type === 'group') {
          return {
            ...q,
            questions: q.questions.map(sq => {
              if (sq.id === id && sq.type === 'dropdown') {
                setDropdownOpen(null);
                return { ...sq, selectedValue };
              }
              return sq;
            }),
          };
        }
        return q;
      }),
    })));
  };

  const renderQuestion = (question: Question, isSubQuestion: boolean = false) => {
    const paddingClass = isSubQuestion ? 'pl-6' : '';

    switch (question.type) {
      case 'text':
        return (
          <div key={question.id} className={`${paddingClass} mb-4 last:mb-0`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {question.text}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={(question as TextQuestion).value || ''}
              onChange={(e) => isEditable && updateTextValue(question.id, e.target.value)}
              placeholder={(question as TextQuestion).placeholder}
              readOnly={!isEditable}
              className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none ${
                isEditable 
                  ? 'focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white cursor-text' 
                  : 'bg-gray-50 cursor-not-allowed opacity-75'
              }`}
            />
          </div>
        );

      case 'url':
        return (
          <div key={question.id} className={`${paddingClass} mb-4 last:mb-0`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {question.text}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={(question as UrlQuestion).value || ''}
                onChange={(e) => isEditable && updateUrlValue(question.id, e.target.value)}
                placeholder={(question as UrlQuestion).placeholder}
                readOnly={!isEditable}
                className={`flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none ${
                  isEditable 
                    ? 'focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white cursor-text' 
                    : 'bg-gray-50 cursor-not-allowed opacity-75'
                }`}
              />
              {(question as UrlQuestion).value && (
                <a
                  href={(question as UrlQuestion).value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div key={question.id} className={`${paddingClass} mb-3 last:mb-0`}>
            <label className={`flex items-center gap-2 ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
              <input
                type="checkbox"
                checked={(question as CheckboxQuestion).checked || false}
                onChange={(e) => isEditable && updateCheckbox(question.id, e.target.checked)}
                disabled={!isEditable}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {(question as CheckboxQuestion).label || question.text}
              </span>
              {question.required && <span className="text-red-500 text-xs ml-1">*</span>}
            </label>
          </div>
        );

      case 'dropdown':
        const dropdownQuestion = question as DropdownQuestion;
        return (
          <div 
            key={question.id} 
            className={`${paddingClass} mb-4 last:mb-0 relative`}
            ref={(el) => {
              if (el) dropdownRefs.current.set(question.id, el);
              else dropdownRefs.current.delete(question.id);
            }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {question.text}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <button
              type="button"
              onClick={() => isEditable && setDropdownOpen(dropdownOpen === question.id ? null : question.id)}
              disabled={!isEditable}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg transition-all duration-200 focus:outline-none ${
                isEditable 
                  ? 'bg-white hover:border-gray-300 hover:bg-gray-50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 cursor-pointer' 
                  : 'bg-gray-50 cursor-not-allowed opacity-75'
              }`}
            >
              <span className={`${!dropdownQuestion.selectedValue ? 'text-gray-400' : 'text-gray-700'}`}>
                {dropdownQuestion.selectedValue || 'Select an option'}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-all duration-200 ${dropdownOpen === question.id ? 'rotate-180' : ''}`} />
            </button>
            {isEditable && dropdownOpen === question.id && (
              <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="py-1 max-h-60 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  {dropdownQuestion.options.map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateDropdown(question.id, option)}
                      className={`
                        w-full text-left px-4 py-2.5 text-sm transition-colors duration-150
                        flex items-center justify-between group
                        ${index !== dropdownQuestion.options.length - 1 ? 'border-b border-gray-50' : ''}
                        ${dropdownQuestion.selectedValue === option 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <span className="flex-1">{option}</span>
                      {dropdownQuestion.selectedValue === option && (
                        <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-3" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'group':
        const group = question as GroupQuestion;
        const isGroupOpen = openSections.has(group.groupId);
        
        return (
          <div key={group.id} className="mb-4 border border-gray-100 rounded-lg">
            <button
              onClick={() => toggleSection(group.groupId)}
              className="w-full bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors rounded-t-lg"
            >
              <div className="text-left">
                <h4 className="text-sm font-semibold text-gray-800">{group.groupName}</h4>
                <p className="text-xs text-gray-500">{group.text}</p>
              </div>
              <ChevronRight 
                className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
                  isGroupOpen ? 'rotate-90' : ''
                }`}
              />
            </button>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isGroupOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-4">
                {group.questions.map(subQuestion => renderQuestion(subQuestion, true))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 relative z-[100]">
      <div className="p-5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Custom Responses</h3>
        <p className="text-xs text-gray-400 mt-0.5">Questionnaire responses from applicant</p>
      </div>

      <div className="flex flex-col">
        {sections.map((section) => {
          const isOpen = openSections.has(section.id);
          const hasOpenDropdownInside = section.questions.some(q => 
            q.id === dropdownOpen || (q.type === 'group' && q.questions.some(sq => sq.id === dropdownOpen))
          );
          
          return (
            <div 
              key={section.id} 
              className={`relative border-b last:border-b-0 border-gray-100 ${
                hasOpenDropdownInside ? 'z-[999]' : isOpen ? 'z-20' : 'z-10'
              }`}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-5 py-4 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-gray-800">{section.title}</h4>
                  {section.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
                  )}
                </div>
                <ChevronRight 
                  className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>
              
              {/* Section Content - Slides open/closed */}
              <div
                className={`transition-all duration-300 ease-in-out ${
                  isOpen ? 'max-h-[2000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="px-5 pb-5 pt-2 bg-gray-50/30">
                  {section.questions.map(question => renderQuestion(question))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
  );
};

export default CustomResponses;