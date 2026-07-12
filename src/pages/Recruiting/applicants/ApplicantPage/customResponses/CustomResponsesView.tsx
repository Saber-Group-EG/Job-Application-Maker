import { useCallback } from 'react';
import SmartText from '../../../../../components/common/SmartText';
import { useLocale } from '../../../../../context/LocaleContext';
import type {
  ArrayObjectItemModel,
  CustomResponseEntry,
  NormalizedValueModel,
  ObjectFieldModel,
  UnknownRecord,
} from '../../../../../types/applicants';
import {
  buildObjectFieldModels,
  containsArabicInValue,
  findReadableValue,
  isArabic,
  isString,
  normalizeResponseValue,
} from './customResponses.utils';

type CustomResponsesViewProps = {
  entries: CustomResponseEntry[];
  expandedTextByKey: Record<string, boolean>;
  onToggleText: (entryKey: string) => void;
  isSectionItemExpanded: (entryKey: string, itemIndex: number) => boolean;
  onToggleSectionItem: (entryKey: string, itemIndex: number) => void;
  isGroupFieldExpanded: (entryKey: string, itemIndex: number, fieldName: string) => boolean;
  onToggleGroupField: (entryKey: string, itemIndex: number, fieldName: string) => void;
};

type CustomResponseCardProps = {
  entry: CustomResponseEntry;
  isTextExpanded: boolean;
  onToggleText: (entryKey: string) => void;
  isSectionItemExpanded: (entryKey: string, itemIndex: number) => boolean;
  onToggleSectionItem: (entryKey: string, itemIndex: number) => void;
  isGroupFieldExpanded: (entryKey: string, itemIndex: number, fieldName: string) => boolean;
  onToggleGroupField: (entryKey: string, itemIndex: number, fieldName: string) => void;
};

type ReadableObjectCardProps = {
  value: UnknownRecord;
  entryKey: string;
  itemIndex: number;
  isGroupFieldExpanded: (entryKey: string, itemIndex: number, fieldName: string) => boolean;
  onToggleGroupField: (entryKey: string, itemIndex: number, fieldName: string) => void;
};

type RenderValueProps = {
  entryKey: string;
  value: unknown;
  isSectionItemExpanded: (entryKey: string, itemIndex: number) => boolean;
  onToggleSectionItem: (entryKey: string, itemIndex: number) => void;
  isGroupFieldExpanded: (entryKey: string, itemIndex: number, fieldName: string) => boolean;
  onToggleGroupField: (entryKey: string, itemIndex: number, fieldName: string) => void;
};

type ObjectFieldRowProps = {
  model: ObjectFieldModel;
  entryKey: string;
  itemIndex: number;
  isGroupFieldExpanded: (entryKey: string, itemIndex: number, fieldName: string) => boolean;
  onToggleGroupField: (entryKey: string, itemIndex: number, fieldName: string) => void;
};

type ArrayObjectItemProps = {
  entryKey: string;
  model: ArrayObjectItemModel;
  isSectionItemExpanded: (entryKey: string, itemIndex: number) => boolean;
  onToggleSectionItem: (entryKey: string, itemIndex: number) => void;
  isGroupFieldExpanded: (entryKey: string, itemIndex: number, fieldName: string) => boolean;
  onToggleGroupField: (entryKey: string, itemIndex: number, fieldName: string) => void;
};

const ObjectFieldRow = ({ model, entryKey, itemIndex, isGroupFieldExpanded, onToggleGroupField }: ObjectFieldRowProps) => {
  const isExpanded = isGroupFieldExpanded(entryKey, itemIndex, model.fieldKey);

  const handleToggleField = useCallback(() => {
    onToggleGroupField(entryKey, itemIndex, model.fieldKey);
  }, [entryKey, itemIndex, model.fieldKey, onToggleGroupField]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white/70 px-4 py-3 transition hover:bg-white hover:shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0 sm:pt-1 min-w-[150px] text-left">
          <span className="opacity-80">{model.label} :</span>
        </div>

        <div
          dir={model.rowIsArabic ? 'rtl' : 'ltr'}
          className={`text-sm font-semibold text-gray-800 whitespace-pre-wrap break-words leading-relaxed flex-1 ${model.rowIsArabic ? 'text-right' : 'text-left'}`}
        >
          {model.canTruncate && !isExpanded ? (
            <span className="inline-flex items-center gap-1">
              <span>{model.displayText.slice(0, 40)}</span>
              <button
                type="button"
                onClick={handleToggleField}
                className="text-brand-600 hover:text-brand-700 font-bold px-1 transition-colors"
                aria-label={`Expand ${model.label}`}
              >
                ...
              </button>
            </span>
          ) : model.nestedObject ? (
            <ReadableObjectCard
              value={model.nestedObject}
              entryKey={entryKey}
              itemIndex={itemIndex}
              isGroupFieldExpanded={isGroupFieldExpanded}
              onToggleGroupField={onToggleGroupField}
            />
          ) : model.href ? (
            <a href={model.href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-words">
              {model.displayText}
            </a>
          ) : (
            <SmartText value={findReadableValue(model.rawValue) || model.rawValue} preserveNewlines className="break-words" />
          )}
        </div>
      </div>
    </div>
  );
};

const ReadableObjectCard = ({ value, entryKey, itemIndex, isGroupFieldExpanded, onToggleGroupField }: ReadableObjectCardProps) => {
  const fieldModels = buildObjectFieldModels(value);
  if (fieldModels.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
      {fieldModels.map((fieldModel) => (
        <ObjectFieldRow
          key={fieldModel.fieldKey}
          model={fieldModel}
          entryKey={entryKey}
          itemIndex={itemIndex}
          isGroupFieldExpanded={isGroupFieldExpanded}
          onToggleGroupField={onToggleGroupField}
        />
      ))}
    </div>
  );
};

const ArrayObjectItem = ({ entryKey, model, isSectionItemExpanded, onToggleSectionItem, isGroupFieldExpanded, onToggleGroupField }: ArrayObjectItemProps) => {
  const expanded = isSectionItemExpanded(entryKey, model.itemIndex);

  const handleToggleSectionItem = useCallback(() => {
    onToggleSectionItem(entryKey, model.itemIndex);
  }, [entryKey, model.itemIndex, onToggleSectionItem]);

  const normalizedKey = entryKey.replace(/\s|_/g, '').toLowerCase();
  const usesGrayTag = ['workexperience', 'certifications'].includes(normalizedKey);
  const chipClass = usesGrayTag
    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/30 dark:text-gray-300 dark:hover:bg-gray-800/50'
    : 'bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50';

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleToggleSectionItem}
        className={`inline-flex items-center justify-between w-full gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${chipClass}`}
      >
        <span dir={model.summaryIsArabic ? 'rtl' : undefined} className={`${model.summaryIsArabic ? 'text-right w-full' : ''} font-cairo`}>
          {model.summaryDisplay}
        </span>
        <svg
          className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <ReadableObjectCard
            value={model.value}
            entryKey={entryKey}
            itemIndex={model.itemIndex}
            isGroupFieldExpanded={isGroupFieldExpanded}
            onToggleGroupField={onToggleGroupField}
          />
        </div>
      )}
    </div>
  );
};

const renderPrimitiveModel = (model: Extract<NormalizedValueModel, { kind: 'primitive' }>) => {
  if (model.href) {
    return (
      <a href={model.href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-words">
        {model.text}
      </a>
    );
  }

  if (model.isArabic) {
    return (
      <div dir="rtl" className="text-right text-gray-900 dark:text-white">
        {model.multiline ? <div className="whitespace-pre-wrap">{model.text}</div> : model.text}
      </div>
    );
  }

  if (model.multiline) {
    return <div className="whitespace-pre-wrap text-gray-900 dark:text-white">{model.text}</div>;
  }

  return <>{model.text}</>;
};

const RenderValue = ({ entryKey, value, isSectionItemExpanded, onToggleSectionItem, isGroupFieldExpanded, onToggleGroupField }: RenderValueProps) => {
  const model = normalizeResponseValue(value);

  if (model.kind === 'empty') return <>-</>;

  if (model.kind === 'primitive') {
    return renderPrimitiveModel(model);
  }

  if (model.kind === 'array-primitive') {
    if (model.isArabic) {
      return (
        <div dir="rtl" className="text-right text-gray-900 dark:text-white">
          {model.text}
        </div>
      );
    }
    return <>{model.text}</>;
  }

  if (model.kind === 'array-object') {
    return (
      <div className="flex flex-wrap gap-2">
        {model.items.map((itemModel) => (
          <ArrayObjectItem
            key={`${entryKey}_${itemModel.itemIndex}`}
            entryKey={entryKey}
            model={itemModel}
            isSectionItemExpanded={isSectionItemExpanded}
            onToggleSectionItem={onToggleSectionItem}
            isGroupFieldExpanded={isGroupFieldExpanded}
            onToggleGroupField={onToggleGroupField}
          />
        ))}
      </div>
    );
  }

  return (
    <ReadableObjectCard
      value={model.value}
      entryKey={entryKey}
      itemIndex={0}
      isGroupFieldExpanded={isGroupFieldExpanded}
      onToggleGroupField={onToggleGroupField}
    />
  );
};

const CustomResponseCard = ({
  entry,
  isTextExpanded,
  onToggleText,
  isSectionItemExpanded,
  onToggleSectionItem,
  isGroupFieldExpanded,
  onToggleGroupField,
}: CustomResponseCardProps) => {
  const { t } = useLocale();
  const { key, label, value } = entry;

  const valueIsArabic = containsArabicInValue(value);
  const normalizedKey = `${key} ${label}`.replace(/\s|_/g, '').toLowerCase();
  const isCoverText = isString(value) && /cover/.test(normalizedKey);

  const handleToggleText = useCallback(() => {
    onToggleText(key);
  }, [key, onToggleText]);

  return (
    <div className="group self-start p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all duration-200 border-l-4 border-blue-500">
      <div className="flex items-start gap-4">
        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider whitespace-nowrap font-cairo">
          {label}:
        </span>

        {isCoverText ? (
          <button
            type="button"
            onClick={handleToggleText}
            className="inline-flex items-center gap-2 px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
          >
            {isTextExpanded ? t('collapse', 'interview') : t('expand', 'interview')}
            <svg
              className={`w-3 h-3 text-blue-600 dark:text-blue-300 transition-transform ${isTextExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <div className={`text-sm text-gray-900 dark:text-white leading-relaxed ${valueIsArabic ? 'flex-none max-w-[60%] min-w-0 break-words text-right' : 'flex-1'}`}>
            <RenderValue
              entryKey={key}
              value={value}
              isSectionItemExpanded={isSectionItemExpanded}
              onToggleSectionItem={onToggleSectionItem}
              isGroupFieldExpanded={isGroupFieldExpanded}
              onToggleGroupField={onToggleGroupField}
            />
          </div>
        )}
      </div>

      {isCoverText && isTextExpanded && isString(value) && (
        <div
          className={`mt-3 p-2 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 whitespace-pre-wrap ${valueIsArabic ? 'text-right' : ''} max-h-40 overflow-auto`}
          dir={isArabic(value) ? 'rtl' : undefined}
        >
          {value}
        </div>
      )}
    </div>
  );
};

export const CustomResponsesView = ({
  entries,
  expandedTextByKey,
  onToggleText,
  isSectionItemExpanded,
  onToggleSectionItem,
  isGroupFieldExpanded,
  onToggleGroupField,
}: CustomResponsesViewProps) => {
  const { t } = useLocale();
  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-2 border-blue-200 dark:border-blue-900/50 shadow-lg">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-white">{t('applicationResponses', 'personalInfo')}</h3>
            <p className="text-sm text-blue-100 mt-0.5">{t('customResponsesDesc', 'personalInfo')}</p>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {entries.map((entry) => (
          <CustomResponseCard
            key={entry.key}
            entry={entry}
            isTextExpanded={Boolean(expandedTextByKey[entry.key])}
            onToggleText={onToggleText}
            isSectionItemExpanded={isSectionItemExpanded}
            onToggleSectionItem={onToggleSectionItem}
            isGroupFieldExpanded={isGroupFieldExpanded}
            onToggleGroupField={onToggleGroupField}
          />
        ))}
      </div>
    </div>
  );
};
