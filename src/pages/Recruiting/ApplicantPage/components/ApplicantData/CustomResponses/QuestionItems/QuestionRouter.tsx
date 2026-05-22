// ApplicantData/CustomResponse/QuestionItems/QuestionRouter.tsx
import React from 'react';
import type { Question } from '../../../../../../../types/applicants';
import type { QuestionHandlers } from './types';
import { TextItem } from './TextItem';
import { NumberItem } from './NumberItem';
import { EmailItem } from './EmailItem';
import { DateItem } from './DateItem';
import { UrlItem } from './UrlItem';
import { CheckboxItem } from './CheckboxItem';
import { RadioItem } from './RadioItem';
import { DropdownItem } from './DropdownItem';
import { TagsItem } from './TagsItem';
import { GroupItem } from './GroupItem';

interface QuestionRouterProps {
  question: Question;
  handlers: QuestionHandlers;
  isSubQuestion?: boolean;
}

const componentMap: Record<string, React.ComponentType<any>> = {
  text: TextItem,
  number: NumberItem,
  email: EmailItem,
  date: DateItem,
  url: UrlItem,
  checkbox: CheckboxItem,
  radio: RadioItem,
  dropdown: DropdownItem,
  tags: TagsItem,
  group: GroupItem,
};

export const QuestionRouter: React.FC<QuestionRouterProps> = ({ 
  question, 
  handlers, 
  isSubQuestion = false 
}) => {
  const Component = componentMap[question.type];
  
  if (!Component) {
    console.warn(`Unknown question type: ${question.type}`);
    return null;
  }

  const wrap = (node: React.ReactNode) =>
    isSubQuestion ? <div className="pl-6">{node}</div> : <>{node}</>;

  return wrap(<Component question={question} handlers={handlers} />);
};