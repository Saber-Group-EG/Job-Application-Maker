// Editing-state shapes for the Create/Edit job form. Bilingual text is kept
// as parallel EN/AR strings while editing and converted to the API's
// { en, ar } objects by buildJobPayload.
import type {
  CustomFieldInputType,
  EmploymentType,
  GroupFieldInputType,
  JobFieldConfig,
  WorkArrangement,
} from '../../../../types/jobPositions';

export type { CustomFieldInputType, EmploymentType, GroupFieldInputType, WorkArrangement };

export type JobSpecDraft = {
  spec: string;
  specAr?: string;
  weight: number;
};

export type SubFieldDraft = {
  fieldId: string;
  label: string;
  labelAr?: string;
  inputType: GroupFieldInputType;
  isRequired: boolean;
  choices?: string[];
  choicesAr?: string[];
};

export type CustomFieldDraft = {
  fieldId: string;
  label: string;
  labelAr?: string;
  inputType: CustomFieldInputType;
  isRequired: boolean;
  minValue?: number;
  maxValue?: number;
  choices?: string[];
  choicesAr?: string[];
  subFields?: SubFieldDraft[];
  displayOrder: number;
};

export type JobForm = {
  companyId: string;
  departmentId: string;
  jobCode: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  salary: number;
  salaryVisible: boolean;
  fieldConfig: JobFieldConfig;
  bilingual: boolean;
  openPositions: number;
  registrationStart: string;
  registrationEnd: string;
  allowedStatuses: string[];
  hideAfterRegistrationEnd: boolean;
  termsAndConditions: string[];
  termsAndConditionsAr: string[];
  jobSpecs: JobSpecDraft[];
  customFields: CustomFieldDraft[];
  employmentType: EmploymentType;
  workArrangement: WorkArrangement;
};

export type SetJobForm = React.Dispatch<React.SetStateAction<JobForm>>;

// A company's configured applicant status (company settings).
export type CompanyStatusOption = {
  _id?: string;
  id?: string;
  name?: string | { en?: string; ar?: string };
  color?: string;
};

// Saved and recommended field templates share this shape.
export type LibraryField = {
  fieldId: string;
  label?: unknown;
  description?: unknown;
  inputType: string;
  isRequired?: boolean;
  minValue?: number;
  maxValue?: number;
  choices?: unknown[];
  groupFields?: LibraryGroupField[];
  subFields?: LibraryGroupField[];
};

export type LibraryGroupField = {
  fieldId?: string;
  label?: unknown;
  inputType: string;
  isRequired?: boolean;
  choices?: unknown[];
};

export type Translate = (key: string, ns?: string, params?: Record<string, string | number>) => string;
