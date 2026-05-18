import { ChevronDown, ExternalLink, Check, ChevronRight } from 'lucide-react';
import { useCustomResponses } from './useCustomResponses';
import type {
  CheckboxQuestion,
  DropdownQuestion,
  GroupQuestion,
  Question,
  ResponseSection,
  TextQuestion,
  UrlQuestion,
} from './customResponses.types';

type QuestionCommonProps = {
  required?: boolean;
  text: string;
};

type TextQuestionItemProps = QuestionCommonProps & {
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

type UrlQuestionItemProps = QuestionCommonProps & {
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

type CheckboxQuestionItemProps = QuestionCommonProps & {
  checked?: boolean;
  label?: string;
  onToggle: (checked: boolean) => void;
};

type DropdownQuestionItemProps = QuestionCommonProps & {
  id: string;
  options: string[];
  selectedValue?: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onSelect: (selectedValue: string) => void;
};

type GroupQuestionItemProps = {
  group: GroupQuestion;
  isOpen: boolean;
  onToggle: (groupId: string) => void;
  renderSubQuestion: (question: Question) => JSX.Element | null;
};

type SectionItemProps = {
  section: ResponseSection;
  isOpen: boolean;
  onToggle: (sectionId: string) => void;
  renderQuestion: (question: Question) => JSX.Element | null;
};

const RequiredMark = ({ required }: { required?: boolean }) => {
  if (!required) return null;
  return <span className="text-red-500 ml-1">*</span>;
};

const TextQuestionItem = ({ text, required, value, placeholder, onChange }: TextQuestionItemProps) => {
  return (
    <div className="mb-4 last:mb-0">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {text}
        <RequiredMark required={required} />
      </label>
      <input
        type="text"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
      />
    </div>
  );
};

const UrlQuestionItem = ({ text, required, value, placeholder, onChange }: UrlQuestionItemProps) => {
  return (
    <div className="mb-4 last:mb-0">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {text}
        <RequiredMark required={required} />
      </label>
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
        {value && (
          <a
            href={value}
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
};

const CheckboxQuestionItem = ({ text, required, checked, label, onToggle }: CheckboxQuestionItemProps) => {
  return (
    <div className="mb-3 last:mb-0">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked || false}
          onChange={(event) => onToggle(event.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">{label || text}</span>
        {required && <span className="text-red-500 text-xs ml-1">*</span>}
      </label>
    </div>
  );
};

const DropdownQuestionItem = ({
  id,
  text,
  required,
  options,
  selectedValue,
  isOpen,
  onToggle,
  onSelect,
}: DropdownQuestionItemProps) => {
  return (
    <div className="mb-4 last:mb-0 relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {text}
        <RequiredMark required={required} />
      </label>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors"
      >
        <span className="text-gray-700">{selectedValue || 'Select an option'}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
            >
              {option}
              {selectedValue === option && <Check className="h-3 w-3 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const GroupQuestionItem = ({ group, isOpen, onToggle, renderSubQuestion }: GroupQuestionItemProps) => {
  return (
    <div className="mb-4 border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(group.groupId)}
        className="w-full bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="text-left">
          <h4 className="text-sm font-semibold text-gray-800">{group.groupName}</h4>
          <p className="text-xs text-gray-500">{group.text}</p>
        </div>
        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4">
          {group.questions.map((subQuestion) => (
            <div key={subQuestion.id} className="pl-6">
              {renderSubQuestion(subQuestion)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SectionItem = ({ section, isOpen, onToggle, renderQuestion }: SectionItemProps) => {
  return (
    <div className="overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(section.id)}
        className="w-full px-5 py-4 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <div className="text-left">
          <h4 className="text-sm font-semibold text-gray-800">{section.title}</h4>
          {section.description && <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>}
        </div>
        <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-5 pt-2 bg-gray-50/30">{section.questions.map((question) => renderQuestion(question))}</div>
      </div>
    </div>
  );
};

const CustomResponses = () => {
  const {
    dropdownOpen,
    openSections,
    sections,
    toggleDropdown,
    toggleSection,
    updateCheckbox,
    updateDropdown,
    updateTextValue,
    updateUrlValue,
  } = useCustomResponses();

  const renderQuestion = (question: Question): JSX.Element | null => {
    switch (question.type) {
      case 'text': {
        const textQuestion = question as TextQuestion;
        return (
          <TextQuestionItem
            text={textQuestion.text}
            required={textQuestion.required}
            value={textQuestion.value}
            placeholder={textQuestion.placeholder}
            onChange={(value) => updateTextValue(textQuestion.id, value)}
          />
        );
      }
      case 'url': {
        const urlQuestion = question as UrlQuestion;
        return (
          <UrlQuestionItem
            text={urlQuestion.text}
            required={urlQuestion.required}
            value={urlQuestion.value}
            placeholder={urlQuestion.placeholder}
            onChange={(value) => updateUrlValue(urlQuestion.id, value)}
          />
        );
      }
      case 'checkbox': {
        const checkboxQuestion = question as CheckboxQuestion;
        return (
          <CheckboxQuestionItem
            text={checkboxQuestion.text}
            required={checkboxQuestion.required}
            checked={checkboxQuestion.checked}
            label={checkboxQuestion.label}
            onToggle={(checked) => updateCheckbox(checkboxQuestion.id, checked)}
          />
        );
      }
      case 'dropdown': {
        const dropdownQuestion = question as DropdownQuestion;
        return (
          <DropdownQuestionItem
            id={dropdownQuestion.id}
            text={dropdownQuestion.text}
            required={dropdownQuestion.required}
            options={dropdownQuestion.options}
            selectedValue={dropdownQuestion.selectedValue}
            isOpen={dropdownOpen === dropdownQuestion.id}
            onToggle={toggleDropdown}
            onSelect={(selectedValue) => updateDropdown(dropdownQuestion.id, selectedValue)}
          />
        );
      }
      case 'group': {
        const groupQuestion = question as GroupQuestion;
        return (
          <GroupQuestionItem
            group={groupQuestion}
            isOpen={openSections.has(groupQuestion.groupId)}
            onToggle={toggleSection}
            renderSubQuestion={renderQuestion}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Custom Responses</h3>
        <p className="text-xs text-gray-400 mt-0.5">Questionnaire responses from applicant</p>
      </div>

      <div className="divide-y divide-gray-100">
        {sections.map((section) => {
          return (
            <SectionItem
              key={section.id}
              section={section}
              isOpen={openSections.has(section.id)}
              onToggle={toggleSection}
              renderQuestion={renderQuestion}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CustomResponses;