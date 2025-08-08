/**
 * Sanitizes sensitive strings for logging, showing only first and last few characters
 * @param value - The sensitive value to sanitize
 * @param label - Optional label for the value (used when value is too short)
 * @returns Sanitized string safe for logging
 */
export const sanitize = (value: string | undefined, label: string = 'value'): string => {
  if (!value) return '[empty]';
  
  // For very short values, hide completely
  if (value.length <= 10) {
    return `${label}[***]`;
  }
  
  // Show first 4 and last 4 characters
  return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
};

/**
 * Sanitizes a client secret or password - always fully redacted
 * @param value - The secret value
 * @returns Always returns [REDACTED]
 */
export const sanitizeSecret = (value: string | undefined): string => {
  if (!value) return '[empty]';
  return '[REDACTED]';
};

/**
 * Formats a timestamp difference for logging
 * @param expiresAt - Expiry timestamp in milliseconds
 * @returns Human-readable time remaining
 */
export const formatTimeRemaining = (expiresAt: number): string => {
  const now = Date.now();
  const remaining = expiresAt - now;
  
  if (remaining <= 0) return 'expired';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

/**
 * Logs debug information with a consistent prefix
 * @param context - The context/module name
 * @param message - The message to log
 * @param data - Optional data object to log
 */
export const logDebug = (context: string, message: string, data?: any): void => {
  const prefix = `[${context}]`;
  if (data) {
    console.log(`${prefix} ${message}:`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

/**
 * Logs error information with a consistent prefix
 * @param context - The context/module name
 * @param message - The error message
 * @param error - The error object
 */
export const logError = (context: string, message: string, error: any): void => {
  const prefix = `[${context}]`;
  console.error(`${prefix} ${message}:`, error);
  if (error?.stack) {
    console.error(`${prefix} Stack trace:`, error.stack);
  }
};