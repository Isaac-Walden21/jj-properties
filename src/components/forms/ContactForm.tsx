"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";

import { contactSchema, type ContactInput } from "@/lib/validation/contact";
import { properties } from "@/content/properties";
import type { ContactResponse } from "@/types";

import { Button } from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import TextAreaField from "@/components/ui/TextAreaField";
import SelectField from "@/components/ui/SelectField";

const inquiryOptions = [
  { value: "buy", label: "Buy a Property" },
  { value: "sell", label: "Sell a Property" },
  { value: "invest", label: "Investment Inquiry" },
  { value: "general", label: "General Question" },
];

const propertyOptions = properties.map((p) => ({
  value: p.slug,
  label: p.name,
}));

export function ContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [serverError, setServerError] = useState<string | null>(null);

  const defaultType = searchParams.get("type");
  const defaultProperty = searchParams.get("property");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      inquiryType: isValidInquiryType(defaultType) ? defaultType : undefined,
      propertyInterest: defaultProperty ?? "",
      message: "",
      honeypot: "",
    },
  });

  async function onSubmit(data: ContactInput) {
    setServerError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result: ContactResponse = await response.json();

      if (!response.ok || !result.ok) {
        setServerError(
          result.message || "Something went wrong. Please try again."
        );
        return;
      }

      router.push("/thank-you");
    } catch {
      setServerError(
        "Unable to reach the server. Please check your connection and try again."
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-2xl border border-navy/10 bg-sand p-6 shadow-card"
    >
      {serverError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      {/* Name row */}
      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          label="First Name"
          requiredLabel
          placeholder="John"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <InputField
          label="Last Name"
          requiredLabel
          placeholder="Doe"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
      </div>

      <div className="mt-5">
        <InputField
          label="Email"
          requiredLabel
          type="email"
          placeholder="john@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <div className="mt-5">
        <InputField
          label="Phone"
          type="tel"
          placeholder="(555) 123-4567"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <div className="mt-5">
        <SelectField
          label="Inquiry Type"
          requiredLabel
          options={inquiryOptions}
          error={errors.inquiryType?.message}
          {...register("inquiryType")}
        />
      </div>

      <div className="mt-5">
        <SelectField
          label="Property of Interest"
          options={propertyOptions}
          error={errors.propertyInterest?.message}
          {...register("propertyInterest")}
        />
      </div>

      <div className="mt-5">
        <TextAreaField
          label="Message"
          requiredLabel
          rows={5}
          placeholder="Tell us how we can help..."
          error={errors.message?.message}
          {...register("message")}
        />
      </div>

      {/* Honeypot — visually hidden from real users */}
      <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
        <input
          tabIndex={-1}
          autoComplete="off"
          {...register("honeypot")}
        />
      </div>

      <div className="mt-8">
        <Button type="submit" size="lg" loading={isSubmitting}>
          Send Message
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isValidInquiryType(
  value: string | null
): value is "buy" | "sell" | "invest" | "general" {
  return (
    value === "buy" ||
    value === "sell" ||
    value === "invest" ||
    value === "general"
  );
}
