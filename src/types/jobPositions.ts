// Mirrors the backend JobPosition model (application-maker:
// src/models/jobPosition.model.js) and its Joi validation
// (src/validation/jobPosition.validation.js).

export type LocalizedString = { en: string; ar: string };
// Stored bilingual text: either side may be missing (single-language jobs
// only send `en`).
export type LocalizedText = { en?: string; ar?: string };

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type WorkArrangement = 'on-site' | 'remote' | 'hybrid';

// CustomFieldSchema.inputType
export type CustomFieldInputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'date'
  | 'radio'
  | 'dropdown'
  | 'checkbox'
  | 'url'
  | 'tags'
  | 'repeatable_group';

// GroupFieldSchema.inputType (a group can't nest another group)
export type GroupFieldInputType = Exclude<CustomFieldInputType, 'repeatable_group'>;

export type JobFieldConfigRule = {
  visible: boolean;
  required: boolean;
};

export type JobFieldConfig = {
  fullName: JobFieldConfigRule;
  email: JobFieldConfigRule;
  phone: JobFieldConfigRule;
  gender: JobFieldConfigRule;
  birthDate: JobFieldConfigRule;
  address: JobFieldConfigRule;
  profilePhoto: JobFieldConfigRule;
  cvFilePath: JobFieldConfigRule;
  expectedSalary: JobFieldConfigRule;
};

export type JobGroupField = {
  fieldId: string;
  label?: LocalizedText;
  inputType: GroupFieldInputType;
  isRequired?: boolean;
  choices?: LocalizedText[];
  defaultValue?: string | null;
  minValue?: number;
  maxValue?: number;
  displayOrder?: number;
  /** Legacy name for displayOrder on old documents. */
  order?: number;
};

export type JobCustomField = {
  fieldId: string;
  label?: LocalizedText;
  inputType: CustomFieldInputType;
  isRequired?: boolean;
  choices?: LocalizedText[];
  groupFields?: JobGroupField[];
  defaultValue?: string | null;
  minValue?: number;
  maxValue?: number;
  displayOrder?: number;
  /** Legacy name for displayOrder on old documents. */
  order?: number;
};

export type JobSpecEntry = {
  spec: LocalizedText;
  weight: number;
};

// What the pre-find hook populates on reads.
export type JobCompanyRef =
  | string
  | {
      _id: string;
      name?: string | LocalizedText;
      description?: string | LocalizedText;
      contactEmail?: string;
      phone?: string;
      logoPath?: string;
    };

export type JobDepartmentRef =
  | string
  | {
      _id: string;
      name?: string | LocalizedText;
      description?: string | LocalizedText;
      managerId?: string | { _id: string; fullName?: string; email?: string; phone?: string };
    };

export type JobPosition = {
  _id: string;
  companyId: JobCompanyRef;
  departmentId: JobDepartmentRef;
  jobCode: string;
  slug?: string;
  order?: number;
  color?: string;
  title: LocalizedText;
  description?: LocalizedText;
  bilingual?: boolean;
  isActive?: boolean;
  employmentType: EmploymentType;
  workArrangement: WorkArrangement;
  salary?: number;
  salaryVisible?: boolean;
  fieldConfig?: JobFieldConfig;
  openPositions?: number;
  registrationStart?: string;
  registrationEnd?: string;
  hideAfterRegistrationEnd?: boolean;
  allowedStatuses?: string[];
  termsAndConditions?: LocalizedText[];
  jobSpecs?: JobSpecEntry[];
  customFields?: JobCustomField[];
  usedSavedFields?: string[];
  createdBy?: string | { _id: string; fullName?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  /** Computed by list endpoints. */
  applicantsCount?: number;
  /** Added client-side by jobPositionsService.normalizeJobPosition. */
  jobSpecsWithDetails?: Array<{
    jobSpecId: string;
    spec: string;
    weight: number;
    answer: boolean;
  }>;
  /** Legacy fields still present on some old documents. */
  status?: 'open' | 'closed' | 'archived';
  requirements?: string[];
  salaryFieldVisible?: boolean;
};

// createJobPositionSchema
export type CreateJobPositionRequest = {
  companyId: string;
  departmentId: string;
  jobCode: string;
  createdBy?: string;
  order?: number;
  color?: string;
  title: LocalizedText;
  description?: LocalizedText;
  bilingual?: boolean;
  isActive?: boolean;
  employmentType: EmploymentType;
  workArrangement: WorkArrangement;
  salary?: number;
  salaryVisible?: boolean;
  openPositions?: number;
  registrationStart: string;
  registrationEnd: string;
  hideAfterRegistrationEnd?: boolean;
  allowedStatuses?: string[];
  termsAndConditions?: LocalizedText[];
  jobSpecs?: JobSpecEntry[];
  customFields?: JobCustomField[];
  fieldConfig?: JobFieldConfig;
};

// updateJobPositionSchema (no jobCode; workArrangement is required by the
// validator, so every update sends it).
export type UpdateJobPositionRequest = Partial<Omit<CreateJobPositionRequest, 'jobCode' | 'createdBy'>> & {
  jobCode?: string;
};

export type ReorderJobPositionsRequestItem = {
  id: string;
  order: number;
};

// POST /job-positions/generate-fields (jobFieldGeneratorHandler): the AI
// draft after the backend has validated and normalized it. Text is
// English-only; choices are plain strings.
export type GeneratedJobFields = {
  title: string;
  description: string;
  termsAndConditions: string[];
  jobSpecs: Array<{ spec: string; weight: number }>;
  customFields: Array<{
    fieldId: string;
    label: string;
    inputType: CustomFieldInputType;
    isRequired: boolean;
    choices: string[];
    groupFields: Array<{
      fieldId: string;
      label: string;
      inputType: GroupFieldInputType;
      isRequired: boolean;
      choices: string[];
      displayOrder: number;
    }>;
    displayOrder: number;
  }>;
};
