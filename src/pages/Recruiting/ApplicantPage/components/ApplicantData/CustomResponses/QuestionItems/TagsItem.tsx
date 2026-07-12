// Components/QuestionItems/TagsItem.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLocale } from '../../../../../../../context/LocaleContext';
import type { TagsQuestion } from '../../../../../../../types/applicants';
import type { QuestionHandlers } from './types';

export const TagsItem: React.FC<{ 
  question: TagsQuestion; 
  handlers: Pick<QuestionHandlers, 'isEditable' | 'onTagsChange'>;
}> = ({ question, handlers }) => {
  const { t } = useLocale();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const values = question.values ?? [];

  const suggestions = (question.options ?? []).filter(
    (o) => !values.includes(o) && o.toLowerCase().includes(inputValue.toLowerCase()),
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !values.includes(trimmed)) {
      handlers.onTagsChange(question.id, [...values, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    handlers.onTagsChange(question.id, values.filter((v) => v !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && values.length > 0) {
      removeTag(values[values.length - 1]);
    }
  };

  return (
    <div className="mb-4 last:mb-0" ref={containerRef}>
      {question.text.toLowerCase() !== 'answer' && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {question.text}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </label>)}
      <div
        className={`min-h-[38px] w-full px-2 py-1.5 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg ${
          handlers.isEditable ? 'bg-white cursor-text' : 'bg-gray-50 opacity-75'
        }`}
        onClick={() => handlers.isEditable && document.getElementById(`tags-input-${question.id}`)?.focus()}
      >
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md"
          >
            {tag}
            {handlers.isEditable && (
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {handlers.isEditable && (
          <input
            id={`tags-input-${question.id}`}
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={values.length === 0 ? (question.placeholder ?? t('typeAndPressEnter', 'common')) : ''}
            className="flex-1 min-w-[120px] text-sm outline-none bg-transparent py-0.5"
          />
        )}
      </div>
      {handlers.isEditable && showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[100] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};