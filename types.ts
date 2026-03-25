export enum ValidationStatus {
  VALID = 'VALID',
  INVALID_FORMAT = 'INVALID_FORMAT',
  WHITESPACE_ISSUE = 'WHITESPACE_ISSUE',
  EMPTY = 'EMPTY',
  DUPLICATE = 'DUPLICATE'
}

export interface ValidationResult {
  email: string;
  status: ValidationStatus;
  original: string;
  details?: string;
}

export interface ExcelRow {
  [key: string]: any;
}

export interface ProcessedData {
  headers: string[];
  rows: ExcelRow[];
  detectedEmailColumn: string | null;
  validationResults: ValidationResult[];
}

export interface AnalysisSummary {
  total: number;
  valid: number;
  invalid: number;
  whitespaceIssues: number;
  duplicate: number;
}