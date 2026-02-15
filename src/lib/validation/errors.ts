import type { ZodError } from "zod";

/**
 * Converts a ZodError into a flat record of field name to error message,
 * suitable for displaying per-field validation errors in a form.
 */
export function formatContactFieldErrors(
  error: ZodError
): Partial<Record<string, string>> {
  const fieldErrors: Partial<Record<string, string>> = {};

  for (const issue of error.issues) {
    const fieldName = issue.path[0];
    if (typeof fieldName === "string" && !fieldErrors[fieldName]) {
      fieldErrors[fieldName] = issue.message;
    }
  }

  return fieldErrors;
}
