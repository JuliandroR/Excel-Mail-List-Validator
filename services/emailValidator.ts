import { ValidationResult, ValidationStatus } from '../types';

// Standard email regex (permissive but structural)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const validateEmail = (email: any): ValidationResult => {
  if (email === null || email === undefined || email === '') {
    return {
      email: '',
      original: '',
      status: ValidationStatus.EMPTY,
      details: 'Cell is empty'
    };
  }

  const emailStr = String(email);
  
  // Check for surrounding whitespace or non-printable characters
  const trimmed = emailStr.trim();
  const hasWhitespace = emailStr !== trimmed;
  
  if (hasWhitespace) {
    // If it has whitespace, we check if the TRIMMED version is valid
    // If trimmed is valid, it's just a whitespace issue. If trimmed is invalid, it's format.
    const isTrimmedValid = EMAIL_REGEX.test(trimmed);
    if (isTrimmedValid) {
      return {
        email: trimmed,
        original: emailStr,
        status: ValidationStatus.WHITESPACE_ISSUE,
        details: 'Contains leading/trailing whitespace'
      };
    }
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      email: trimmed,
      original: emailStr,
      status: ValidationStatus.INVALID_FORMAT,
      details: 'Invalid email structure or characters'
    };
  }

  return {
    email: trimmed,
    original: emailStr,
    status: ValidationStatus.VALID,
  };
};

export const detectEmailColumn = (headers: string[], rows: any[]): string | null => {
  // 1. Check headers first
  const headerMatch = headers.find(h => 
    h.toLowerCase().includes('email') || 
    h.toLowerCase().includes('e-mail') || 
    h.toLowerCase() === 'mail'
  );
  if (headerMatch) return headerMatch;

  // 2. Heuristic check of first 5 rows
  const limit = Math.min(rows.length, 5);
  const scores: Record<string, number> = {};

  for (const header of headers) {
    scores[header] = 0;
    for (let i = 0; i < limit; i++) {
      const val = String(rows[i][header] || '');
      if (val.includes('@') && val.includes('.')) {
        scores[header]++;
      }
    }
  }

  // Return the header with the most matches, if any match > 0
  let bestHeader = null;
  let maxScore = 0;
  
  for (const [header, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestHeader = header;
    }
  }

  return bestHeader;
};