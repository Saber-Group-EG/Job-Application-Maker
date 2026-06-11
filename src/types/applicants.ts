// ─── Applicant Types (from types/applicants.ts) ───────────────────────────────
// NOTE: In the actual project these types already live in types/applicants.ts
// and are not redeclared here. This file shows what was added there.

import type { ComponentType } from 'react';

export type Interview = {
  _id?: string;
  id?: string;
  issuedBy?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  scheduledBy?: string | { _id?: string; fullName?: string; id?: string };
  conductedBy?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | string;
  type?: string;
  videoLink?: string;
  notes?: string;
  interviewers?: string[];
  questions?: InterviewAnswer[];
  totalScore?: number;
  achievedScore?: number;
  createdAt?: string;
  updatedAt?: string;
  notifications?: {
    channels: { email: boolean; sms: boolean; whatsapp: boolean };
    emailOption?: 'company' | 'user' | 'custom';
    customEmail?: string;
    phoneOption?: 'company' | 'user' | 'whatsapp' | 'custom';
    customPhone?: string;
  };
};

export type InterviewAnswer = {
  _id?: string;
  id?: string;
  question: string;
  score: number;
  achievedScore?: number;
  notes?: string | null;
  answerType?: string;
  choices?: string[];
  groupKey?: string;
  groupName?: string;
  groupSource?: 'company' | 'user';
};

export type Message = {
  _id?: string;
  type: 'email' | 'sms' | 'internal' | 'whatsapp';
  content: string;
  sentAt?: string;
  sentBy?: string;
  subject?: string;
};

export type Comment = {
  _id?: string;
  commentedBy?: string | { _id?: string; fullName?: string; name?: string; email?: string };
  commentedAt?: string;
  changedBy?: string | { _id?: string; fullName?: string; name?: string; email?: string };
  changedAt?: string;
  comment: string;
  text?: string;
  author?: string;
  isInternal?: boolean;
};

export type StatusHistory = {
  _id?: string;
  status: string;
  changedBy: string;
  changedAt: string;
  notes?: string;
  reasons?: string[];
  notifications?: {
    channels: { email: boolean; sms: boolean; whatsapp: boolean };
    emailOption?: 'company' | 'user' | 'custom';
    customEmail?: string;
    phoneOption?: 'company' | 'user' | 'whatsapp' | 'custom';
    customPhone?: string;
  };
};

export type Applicant = {
  _id: string;
  companyId: string;
  jobPositionId: string;
  departmentId: string;
  status: string;
  submittedAt: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  email: string;
  expectedSalary?: string;
  phone: string;
  address?: string;
  profilePhoto?: string;
  cvFilePath?: string;
  resume?: string;
  source?: string;
  customResponses?: Record<string, any>;
  jobSpecsResponses?: Array<{ jobSpecId: string; answer: boolean }>;
  jobSpecsWithDetails?: any[];
  interviews?: Interview[];
  messages?: Message[];
  comments?: Comment[];
  statusHistory?: StatusHistory[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateApplicantRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobPositionId: string;
  companyId: string;
  departmentId: string;
  resume?: string;
  source?: string;
  address?: string;
  customResponses?: Record<string, any>;
  expectedSalary?: string;
};

export type UpdateApplicantRequest = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  resume?: string;
  customResponses?: Record<string, any>;
};

export type UpdateStatusRequest = {
  status: string;
  notes?: string;
  notifications?: {
    channels: { email: boolean; sms: boolean; whatsapp: boolean };
    emailOption?: 'company' | 'user' | 'custom';
    customEmail?: string;
    phoneOption?: 'company' | 'user' | 'whatsapp' | 'custom';
    customPhone?: string;
  };
  reasons?: string[];
};

export type ScheduleInterviewRequest = {
  scheduledAt?: string;
  conductedBy?: string;
  scheduledBy?: string;
  description?: string | null;
  location?: string | null;
  videoLink?: string;
  address?: string | null;
  type?: string | null;
  notes?: string;
  interviewers?: string[];
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  questions?: InterviewAnswer[];
  notifications?: {
    channels?: { email?: boolean; sms?: boolean; whatsapp?: boolean };
    emailOption?: string;
    customEmail?: string;
    phoneOption?: string;
    customPhone?: string;
  };
};

export type BulkScheduleInterviewItem = ScheduleInterviewRequest & { applicantId: string };

export type BulkScheduleInterviewRequest = { interviews: BulkScheduleInterviewItem[] };

export type UpdateInterviewStatusRequest = {
  scheduledAt?: string;
  scheduledBy?: string;
  startedAt?: string;
  endedAt?: string;
  conductedBy?: string;
  description?: string | null;
  location?: string | null;
  videoLink?: string;
  address?: string | null;
  type?: string | null;
  notes?: string | null;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  interviewers?: string[];
  questions?: InterviewAnswer[];
};

export type AddCommentRequest = { comment?: string; text?: string; author?: string };

export type SendMessageRequest = {
  subject?: string;
  content?: string;
  comment?: string;
  type?: 'email' | 'sms' | 'internal' | 'whatsapp';
};

export type RejectionInsights = { reason: string; count: number }[];

// ─── Activity / ActivityFeed ──────────────────────────────────────────────────

export interface Activity {
  id: string;
  type: 'comment' | 'task' | 'status_change' | 'document' | 'application' | 'email' | 'notification' | 'message' | 'interview';
  title: string;
  description?: string;
  timestamp: string;
  user?: { name: string; avatar?: string };
  comment?: string;
  status?: string;
  subject?: string;
  scheduledAt?: string;
  endedAt?: string;
  conductedBy?: string;
  interviewStatus?: string;
}

export interface ActivityItem {
  id: string;
  type: 'comment' | 'status_change' | 'message' | 'interview' | 'application';
  title: string;
  description?: string;
  timestamp: string;
  user?: { name: string; avatar?: string };
  comment?: string;
  status?: string;
  messageChannel?: string;
  interviewStatus?: string;
  subject?: string;
  scheduledAt?: string;
  endedAt?: string;
  conductedBy?: string;
}

export type ActivityLike = Partial<Comment & StatusHistory & Message & Interview> & {
  _id?: string;
  id?: string;
  createdAt?: string;
  author?: string;
  changedBy?: string;
  sentBy?: string;
  issuedBy?: string;
  changedAt?: string;
  sentAt?: string;
  scheduledAt?: string;
  status?: string;
  notes?: string;
  type?: string;
  content?: string;
  subject?: string;
  comment?: string;
  text?: string;
};

export interface ActivityFeedProps {
  activities?: Activity[];
  mailRecords?: Array<{ createdAt: string; html: string }>;
  interviews?: Interview[];
}

// ─── JobSpec ──────────────────────────────────────────────────────────────────

export interface JobSpecItem {
  jobSpecId: string;
  answer: boolean;
  _id: string;
  id: string;
  spec: { en: string };
  weight: number;
}

export interface JobSpecProps {
  specs?: JobSpecItem[];
  jobPosition?: {
    jobSpecs?: any[];
    jobSpecsWithDetails?: any[];
    [key: string]: any;
  } | null;
  editable?: boolean;
  onSpecChange?: (id: string, answer: boolean) => void;
}

export type JobSpecLike = {
  _id?: string;
  jobSpecId?: string;
  id?: string;
  answer?: boolean;
  weight?: number;
  spec?: { en?: string } | string;
  title?: string;
  label?: string;
  name?: string;
};

export type JobSpecResponseLike = {
  jobSpecId?: string;
  _id?: string;
  id?: string;
  answer?: boolean;
};

// ─── PersonalInfo ─────────────────────────────────────────────────────────────

export interface PersonalInfoProps {
  applicant: Applicant;
  isEditing?: boolean;
  editedApplicant?: Partial<Applicant> | null;
  onChange?: (next: Partial<Applicant>) => void;
  onChangeStatus?: () => void;
  onScheduleInterview?: () => void;
  onSendMessage?: () => void;
  onPrint?: () => void;
}

export type ApplicantView = Omit<Applicant, 'companyId' | 'jobPositionId'> & {
  cvFilePath?: string;
  resume?: string;
  submittedAt?: string;
  createdAt?: string;
  companyId?: string | { _id: string };
  jobPositionId?: string | { _id: string; title?: string };
};

// ─── InterviewQuestions ───────────────────────────────────────────────────────

export interface InterviewQuestionsProps {
  applicantId?: string;
  onRequestScheduleInterview?: () => void;
  autoSelectInterviewId?: string | null;
}

export interface InterviewQuestionData {
  question: string;
  score: number;
  answerType: string;
  choices: string[];
  _id: string;
  id: string;
  description?: string;
  achievedScore?: number;
}

export interface InterviewGroupData {
  name: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  _id: string;
  questions: InterviewQuestionData[];
}

export interface InterviewData {
  groups: InterviewGroupData[];
}

// ─── CustomResponses (component props) ───────────────────────────────────────

export interface CustomResponsesProps {
  isEditable?: boolean;
  sections?: ResponseSection[];
  onSectionsChange?: (sections: ResponseSection[]) => void;
}

export interface CustomResponsesContainerProps {
  isEditable?: boolean;
  sections: ResponseSection[];
  onSectionsChange?: (sections: ResponseSection[]) => void;
}

export interface CustomResponsesViewProps {
  sections: ResponseSection[];
  expandedSectionIds: Set<string>;
  openDropdownId: string | null;
  onToggleSection: (sectionId: string) => void;
  handlers: QuestionHandlers;
}

export interface QuestionRouterProps {
  question: Question;
  handlers: QuestionHandlers;
  isSubQuestion?: boolean;
}

export interface QuestionHandlers {
  isEditable: boolean;
  openDropdownId: string | null;
  expandedGroupIds: Set<string>;
  dropdownRefs: import('react').MutableRefObject<Map<string, HTMLDivElement>>;
  onToggleDropdown: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onTextChange: (id: string, value: string) => void;
  onUrlChange: (id: string, value: string) => void;
  onNumberChange: (id: string, value: number) => void;
  onEmailChange: (id: string, value: string) => void;
  onDateChange: (id: string, value: string) => void;
  onCheckboxChange: (id: string, checked: boolean) => void;
  onRadioChange: (id: string, value: string) => void;
  onDropdownSelect: (id: string, value: string) => void;
  onTextareaChange: (id: string, value: string) => void;
  onTagsChange: (id: string, values: string[]) => void;
}

// ─── CustomResponses Question Types ──────────────────────────────────────────

export interface BaseQuestion {
  id: string;
  text: string;
  type: 'text' | 'number' | 'email' | 'date' | 'url' | 'checkbox' | 'radio' | 'dropdown' | 'textarea' | 'tags' | 'group';
  required?: boolean;
}

export interface TextQuestion extends BaseQuestion {
  type: 'text';
  value?: string;
  placeholder?: string;
}

export interface NumberQuestion extends BaseQuestion {
  type: 'number';
  value?: number;
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface EmailQuestion extends BaseQuestion {
  type: 'email';
  value?: string;
  placeholder?: string;
}

export interface DateQuestion extends BaseQuestion {
  type: 'date';
  value?: string; // ISO date string
}

export interface UrlQuestion extends BaseQuestion {
  type: 'url';
  value?: string;
  placeholder?: string;
}

export interface CheckboxQuestion extends BaseQuestion {
  type: 'checkbox';
  checked?: boolean;
  label?: string;
}

export interface RadioQuestion extends BaseQuestion {
  type: 'radio';
  options: string[];
  selectedValue?: string;
}

export interface DropdownQuestion extends BaseQuestion {
  type: 'dropdown';
  options: string[];
  selectedValue?: string;
}

export interface TextareaQuestion extends BaseQuestion {
  type: 'textarea';
  value?: string;
  placeholder?: string;
  rows?: number;
}

export interface TagsQuestion extends BaseQuestion {
  type: 'tags';
  values?: string[];       // selected tags
  options?: string[];      // predefined suggestions (optional)
  placeholder?: string;
}

export type LeafQuestion =
  | TextQuestion
  | NumberQuestion
  | EmailQuestion
  | DateQuestion
  | UrlQuestion
  | CheckboxQuestion
  | RadioQuestion
  | DropdownQuestion
  | TextareaQuestion
  | TagsQuestion;

export interface GroupQuestion extends BaseQuestion {
  type: 'group';
  groupId: string;
  groupName: string;
  questions: LeafQuestion[];
}

export type Question = LeafQuestion | GroupQuestion;

export interface ResponseSection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

export const isTextQuestion     = (q: Question): q is TextQuestion     => q.type === 'text';
export const isNumberQuestion   = (q: Question): q is NumberQuestion   => q.type === 'number';
export const isEmailQuestion    = (q: Question): q is EmailQuestion    => q.type === 'email';
export const isDateQuestion     = (q: Question): q is DateQuestion     => q.type === 'date';
export const isUrlQuestion      = (q: Question): q is UrlQuestion      => q.type === 'url';
export const isCheckboxQuestion = (q: Question): q is CheckboxQuestion => q.type === 'checkbox';
export const isRadioQuestion    = (q: Question): q is RadioQuestion    => q.type === 'radio';
export const isDropdownQuestion = (q: Question): q is DropdownQuestion => q.type === 'dropdown';
export const isTextareaQuestion = (q: Question): q is TextareaQuestion => q.type === 'textarea';
export const isTagsQuestion     = (q: Question): q is TagsQuestion     => q.type === 'tags';
export const isGroupQuestion    = (q: Question): q is GroupQuestion    => q.type === 'group';

// ─── Static Data ──────────────────────────────────────────────────────────────

export const INITIAL_SECTIONS: ResponseSection[] = [
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