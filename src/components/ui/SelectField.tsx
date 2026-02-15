"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  requiredLabel?: boolean;
  options: SelectOption[];
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, requiredLabel, options, className, id, ...props }, ref) => {
    const selectId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        <label
          htmlFor={selectId}
          className="mb-1 block text-sm font-semibold tracking-wide text-timber"
        >
          {label}
          {requiredLabel && (
            <span className="ml-1 text-amber" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={cn(
            "w-full appearance-none border-b-2 border-stone/40 bg-birch/50 px-1 py-2",
            "text-ink",
            "transition-colors duration-200",
            "focus:border-amber focus:outline-none",
            error && "border-red-500",
            className
          )}
          {...props}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p
            id={`${selectId}-error`}
            role="alert"
            className="mt-1 text-xs text-red-600"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

SelectField.displayName = "SelectField";

export default SelectField;
