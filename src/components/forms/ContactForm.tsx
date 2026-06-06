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
    watch,
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
      sellAskingPrice: "",
      sellCondition: "",
      sellWalkaway: "",
    },
  });

  // Show the sell-specific questions only when the visitor is inquiring about
  // selling a property.
  const isSell = watch("inquiryType") === "sell";

  async function onSubmit(data: ContactInput) {
    setServerError(null);

    // Lead-source attribution: where the form was submitted from (incl. any
    // ?type/?property CTA context) and the property slug in context.
    const payload: ContactInput = {
      ...data,
      sourcePage: window.location.pathname + window.location.search,
      sourceProperty: defaultProperty ?? data.propertyInterest ?? "",
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      {/* Sell-a-property questions — only shown for "sell" inquiries (TWE-132) */}
      {isSell && (
        <div className="mt-5 space-y-5 rounded-xl border border-navy/10 bg-sand-light p-5">
          <p className="text-sm font-semibold text-navy">
            A few details about your property
          </p>
          <InputField
            label="How much are you looking to get for the property?"
            placeholder="e.g. $1,200,000"
            error={errors.sellAskingPrice?.message}
            {...register("sellAskingPrice")}
          />
          <TextAreaField
            label="What is the general condition? Any deferred maintenance?"
            rows={3}
            placeholder="Tell us about the property's condition and any known maintenance needs..."
            error={errors.sellCondition?.message}
            {...register("sellCondition")}
          />
          <InputField
            label="What amount could you receive for the property and still be happy?"
            placeholder="e.g. $1,000,000"
            error={errors.sellWalkaway?.message}
            {...register("sellWalkaway")}
          />
        </div>
      )}

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
