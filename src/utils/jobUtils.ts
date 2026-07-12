import type {
  JobFieldConfig,
  JobFieldConfigRule,
} from '../types/jobPositions';

export type { JobFieldConfig, JobFieldConfigRule };

export const getDefaultFieldConfig = (): JobFieldConfig => ({
  fullName: { visible: true, required: true },
  email: { visible: true, required: true },
  phone: { visible: true, required: true },
  gender: { visible: true, required: true },
  birthDate: { visible: true, required: true },
  address: { visible: true, required: true },
  profilePhoto: { visible: true, required: true },
  cvFilePath: { visible: true, required: false },
  expectedSalary: { visible: false, required: false },
});

const normalizeRule = (
  incoming: any,
  fallback: JobFieldConfigRule
): JobFieldConfigRule => {
  const visible =
    typeof incoming?.visible === 'boolean' ? incoming.visible : fallback.visible;
  const required =
    typeof incoming?.required === 'boolean'
      ? incoming.required
      : fallback.required;
  return { visible, required: visible ? required : false };
};

export const normalizeFieldConfig = (
  value: any,
  legacySalaryFieldVisible?: boolean
): JobFieldConfig => {
  const defaults = getDefaultFieldConfig();
  const raw = value && typeof value === 'object' ? value : {};

  const withExpectedSalaryFallback = {
    ...raw,
    expectedSalary:
      raw.expectedSalary && typeof raw.expectedSalary === 'object'
        ? raw.expectedSalary
        : typeof legacySalaryFieldVisible === 'boolean'
          ? { visible: legacySalaryFieldVisible, required: false }
          : raw.expectedSalary,
  };

  return {
    fullName: normalizeRule(withExpectedSalaryFallback.fullName, defaults.fullName),
    email: normalizeRule(withExpectedSalaryFallback.email, defaults.email),
    phone: normalizeRule(withExpectedSalaryFallback.phone, defaults.phone),
    gender: normalizeRule(withExpectedSalaryFallback.gender, defaults.gender),
    birthDate: normalizeRule(withExpectedSalaryFallback.birthDate, defaults.birthDate),
    address: normalizeRule(withExpectedSalaryFallback.address, defaults.address),
    profilePhoto: normalizeRule(
      withExpectedSalaryFallback.profilePhoto,
      defaults.profilePhoto
    ),
    cvFilePath: normalizeRule(withExpectedSalaryFallback.cvFilePath, defaults.cvFilePath),
    expectedSalary: normalizeRule(
      withExpectedSalaryFallback.expectedSalary,
      defaults.expectedSalary
    ),
  };
};
