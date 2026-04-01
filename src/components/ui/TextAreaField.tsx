"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextAreaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  requiredLabel?: boolean;
}

const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, requiredLabel, className, id, ...props }, ref) => {
    const textareaId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        <label
          htmlFor={textareaId}
          className="mb-1 block text-sm font-semibold tracking-wide text-navy"
        >
          {label}
          {requiredLabel && (
            <span className="ml-1 text-gold" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          className={cn(
            "w-full resize-y border-b-2 border-stone/40 bg-sand-light/50 px-1 py-2",
            "text-ink placeholder:text-stone/60",
            "transition-colors duration-200",
            "focus:border-gold focus:outline-none",
            error && "border-red-500",
            className
          )}
          {...props}
        />
        {error && (
          <p
            id={`${textareaId}-error`}
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

TextAreaField.displayName = "TextAreaField";

export default TextAreaField;
