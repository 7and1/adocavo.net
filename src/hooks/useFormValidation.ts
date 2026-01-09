"use client";

import { useState, useCallback } from "react";
import { z, type ZodSchema } from "zod";

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

export function useFormValidation<T extends Record<string, unknown>>(
  schema: ZodSchema<T>,
  initialValues: T,
) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isValid: false,
    isSubmitting: false,
  });

  const validateField = useCallback(
    (field: keyof T, value: unknown) => {
      try {
        schema.parse({ ...state.values, [field]: value });
        return undefined;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find((e) => e.path[0] === field);
          return fieldError?.message;
        }
        return "Invalid value";
      }
    },
    [schema, state.values],
  );

  const setFieldValue = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setState((prev) => {
        const newValues = { ...prev.values, [field]: value };
        const error = validateField(field, value);
        const newErrors = { ...prev.errors, [field]: error };
        const result = schema.safeParse(newValues);
        return {
          ...prev,
          values: newValues,
          errors: newErrors,
          isValid: result.success,
        };
      });
    },
    [schema, validateField],
  );

  const setFieldTouched = useCallback((field: keyof T) => {
    setState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [field]: true },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void>) => {
      setState((prev) => ({ ...prev, isSubmitting: true }));

      const result = schema.safeParse(state.values);

      if (!result.success) {
        const errors: Partial<Record<keyof T, string>> = {};
        for (const error of result.error.errors) {
          const field = error.path[0] as keyof T;
          if (!errors[field]) {
            errors[field] = error.message;
          }
        }
        setState((prev) => ({
          ...prev,
          errors,
          isSubmitting: false,
        }));
        return;
      }

      try {
        await onSubmit(result.data);
      } finally {
        setState((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [schema, state.values],
  );

  return {
    ...state,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
  };
}
