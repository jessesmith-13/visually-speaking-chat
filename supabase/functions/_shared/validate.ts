/**
 * Input validation helpers
 */

/**
 * Check if string is non-empty and within length limits
 */
export function validateString(
  value: unknown,
  minLength = 1,
  maxLength = 1000
): { valid: boolean; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, error: 'Must be a string' };
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return { valid: false, error: `Must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Must be at most ${maxLength} characters` };
  }

  return { valid: true };
}

/**
 * Basic email validation
 */
export function validateEmail(email: unknown): { valid: boolean; error?: string } {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate comma-separated email list
 */
export function validateEmailList(emails: unknown): { valid: boolean; error?: string; emails?: string[] } {
  if (typeof emails !== 'string') {
    return { valid: false, error: 'Emails must be a string' };
  }

  const emailArray = emails.split(',').map(e => e.trim()).filter(Boolean);
  
  if (emailArray.length === 0) {
    return { valid: false, error: 'At least one email required' };
  }

  for (const email of emailArray) {
    const result = validateEmail(email);
    if (!result.valid) {
      return { valid: false, error: `Invalid email: ${email}` };
    }
  }

  return { valid: true, emails: emailArray };
}

/**
 * Check if required fields are present
 */
export function validateRequired(
  obj: Record<string, unknown>,
  fields: string[]
): { valid: boolean; error?: string; missing?: string[] } {
  const missing = fields.filter(field => {
    const value = obj[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `Missing required fields: ${missing.join(', ')}`,
      missing 
    };
  }

  return { valid: true };
}

/**
 * Validate UUID format
 */
export function validateUuid(value: unknown): { valid: boolean; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, error: 'UUID must be a string' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return { valid: false, error: 'Invalid UUID format' };
  }

  return { valid: true };
}

/**
 * Validate number with optional constraints
 * Returns the parsed numeric value on success
 * Strict validation for string inputs (rejects "10abc" etc.)
 */
export function validateNumber(
  value: unknown,
  options?: { min?: number; max?: number; integer?: boolean }
): { valid: boolean; error?: string; value?: number } {
  let num: number;

  if (typeof value === 'string') {
    // Strict numeric pattern: optional whitespace, optional minus, digits, optional decimal part
    const numericPattern = /^\s*-?\d+(\.\d+)?\s*$/;
    if (!numericPattern.test(value)) {
      return { valid: false, error: 'Must be a valid number' };
    }
    num = Number(value);
  } else if (typeof value === 'number') {
    num = value;
  } else {
    return { valid: false, error: 'Must be a valid number' };
  }

  if (isNaN(num)) {
    return { valid: false, error: 'Must be a valid number' };
  }

  if (options?.integer && !Number.isInteger(num)) {
    return { valid: false, error: 'Must be an integer' };
  }

  if (options?.min !== undefined && num < options.min) {
    return { valid: false, error: `Must be at least ${options.min}` };
  }

  if (options?.max !== undefined && num > options.max) {
    return { valid: false, error: `Must be at most ${options.max}` };
  }

  return { valid: true, value: num };
}

/**
 * Validate date string (strict ISO 8601 format)
 * Accepts: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ variants
 */
export function validateDateString(value: unknown): { valid: boolean; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, error: 'Date must be a string' };
  }

  // ISO 8601 regex (supports timezone, milliseconds optional)
  // Examples: 2026-01-13T23:10:00Z, 2026-01-13T23:10:00.000Z, 2026-01-13T23:10:00+00:00
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
  
  if (!iso8601Regex.test(value.trim())) {
    return { valid: false, error: 'Must be ISO 8601 format (e.g., 2026-01-13T23:10:00Z)' };
  }

  // Verify it's actually parseable
  const timestamp = Date.parse(value);
  if (isNaN(timestamp)) {
    return { valid: false, error: 'Invalid date' };
  }

  return { valid: true };
}

/**
 * Sanitize text for safe storage/display (basic)
 * Removes HTML tags and limits length
 */
export function sanitizeText(text: string, maxLength = 10000): string {
  // Remove HTML tags
  const withoutHtml = text.replace(/<[^>]*>/g, '');
  
  // Trim and limit length
  return withoutHtml.trim().substring(0, maxLength);
}
