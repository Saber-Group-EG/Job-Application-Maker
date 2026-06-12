import { useCallback, useState } from 'react';
import type {
  CheckboxQuestion,
  DropdownQuestion,
  GroupQuestion,
  LeafQuestion,
  Question,
  ResponseSection,
  TextQuestion,
  UrlQuestion,
} from './customResponses.types';

const INITIAL_OPEN_SECTIONS = ['personal_info', 'skills', 'experience'];

const INITIAL_SECTIONS: ResponseSection[] = [
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
];

const isGroupQuestion = (question: Question): question is GroupQuestion => question.type === 'group';

const updateLeafQuestionById = (
  question: LeafQuestion,
  id: string,
  updater: (leaf: LeafQuestion) => LeafQuestion,
): LeafQuestion => {
  if (question.id !== id) return question;
  return updater(question);
};

const updateQuestions = (
  questions: Question[],
  id: string,
  updater: (leaf: LeafQuestion) => LeafQuestion,
): Question[] => {
  return questions.map((question) => {
    if (isGroupQuestion(question)) {
      return {
        ...question,
        questions: question.questions.map((subQuestion) => updateLeafQuestionById(subQuestion, id, updater)),
      };
    }

    return updateLeafQuestionById(question, id, updater);
  });
};

export const useCustomResponses = () => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(INITIAL_OPEN_SECTIONS));
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [sections, setSections] = useState<ResponseSection[]>(INITIAL_SECTIONS);

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const updateTextValue = useCallback((id: string, value: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        questions: updateQuestions(section.questions, id, (question) => {
          if (question.type !== 'text') return question;
          const typedQuestion: TextQuestion = question;
          return { ...typedQuestion, value };
        }),
      })),
    );
  }, []);

  const updateUrlValue = useCallback((id: string, value: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        questions: updateQuestions(section.questions, id, (question) => {
          if (question.type !== 'url') return question;
          const typedQuestion: UrlQuestion = question;
          return { ...typedQuestion, value };
        }),
      })),
    );
  }, []);

  const updateCheckbox = useCallback((id: string, checked: boolean) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        questions: updateQuestions(section.questions, id, (question) => {
          if (question.type !== 'checkbox') return question;
          const typedQuestion: CheckboxQuestion = question;
          return { ...typedQuestion, checked };
        }),
      })),
    );
  }, []);

  const updateDropdown = useCallback((id: string, selectedValue: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        questions: updateQuestions(section.questions, id, (question) => {
          if (question.type !== 'dropdown') return question;
          const typedQuestion: DropdownQuestion = question;
          return { ...typedQuestion, selectedValue };
        }),
      })),
    );

    // Keep side effects outside state transformation.
    setDropdownOpen(null);
  }, []);

  const toggleDropdown = useCallback((questionId: string) => {
    setDropdownOpen((prev) => (prev === questionId ? null : questionId));
  }, []);

  return {
    dropdownOpen,
    openSections,
    sections,
    toggleDropdown,
    toggleSection,
    updateCheckbox,
    updateDropdown,
    updateTextValue,
    updateUrlValue,
  };
};
