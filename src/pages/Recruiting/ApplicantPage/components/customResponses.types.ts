export interface BaseQuestion {
  id: string;
  text: string;
  type: 'text' | 'url' | 'checkbox' | 'dropdown' | 'group';
  required?: boolean;
}

export interface TextQuestion extends BaseQuestion {
  type: 'text';
  value?: string;
  placeholder?: string;
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

export interface DropdownQuestion extends BaseQuestion {
  type: 'dropdown';
  options: string[];
  selectedValue?: string;
}

export type LeafQuestion = TextQuestion | UrlQuestion | CheckboxQuestion | DropdownQuestion;

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
