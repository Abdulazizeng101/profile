"use client";

import { CheckCircle2 } from "lucide-react";
import Script from "next/script";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { getContactToken, sendContactMessage, type ContactResult } from "@/server/actions/contact";

type Labels = {
  formTitle: string;
  name: string;
  emailField: string;
  company: string;
  subject: string;
  message: string;
  send: string;
  sending: string;
  success: string;
  errors: Record<string, string>;
};

type FieldName = "name" | "email" | "company" | "subject" | "message";

const inputClass =
  "w-full rounded-[var(--radius)] border border-border-strong bg-bg px-3 text-[0.95rem] text-fg placeholder:text-subtle transition-[border-color,box-shadow] duration-150 hover:border-[var(--muted)] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-soft aria-invalid:border-danger";

declare global {
  interface Window {
    turnstile?: { getResponse: (id?: string) => string | undefined; reset: (id?: string) => void };
  }
}

export function ContactForm({
  locale,
  labels,
  turnstileSiteKey,
}: {
  locale: "en" | "ar";
  labels: Labels;
  turnstileSiteKey?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ContactResult | null>(null);
  const token = useRef<Promise<string> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // The anti-spam token is requested when the visitor starts filling in the form.
  function ensureToken() {
    token.current ??= getContactToken();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    ensureToken();
    startTransition(async () => {
      const response = await sendContactMessage({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        company: String(data.get("company") ?? ""),
        subject: String(data.get("subject") ?? ""),
        message: String(data.get("message") ?? ""),
        website: String(data.get("website") ?? ""),
        locale,
        token: await token.current!,
        turnstileToken: turnstileSiteKey ? window.turnstile?.getResponse() : undefined,
      });
      setResult(response);
      if (response.ok) {
        formRef.current?.reset();
        token.current = null;
      } else if (response.error === "spam") {
        token.current = null;
        window.turnstile?.reset();
      }
    });
  }

  const fieldError = (name: FieldName) =>
    result && !result.ok && result.fieldErrors?.[name] ? labels.errors[result.fieldErrors[name]!] : undefined;
  const formError = result && !result.ok && !result.fieldErrors ? labels.errors[result.error] : undefined;

  if (result?.ok) {
    return (
      <div role="status" className="panel flex items-start gap-3 p-6">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <p>{labels.success}</p>
      </div>
    );
  }

  const field = (
    name: FieldName,
    label: string,
    props: { type?: string; autoComplete?: string; required?: boolean },
  ) => {
    const error = fieldError(name);
    return (
      <div className="grid gap-1.5">
        <label htmlFor={`contact-${name}`} className="text-sm font-medium">
          {label}
        </label>
        <input
          id={`contact-${name}`}
          name={name}
          type={props.type ?? "text"}
          autoComplete={props.autoComplete}
          required={props.required}
          maxLength={name === "email" ? 200 : 150}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `contact-${name}-error` : undefined}
          className={`${inputClass} h-11`}
          dir={name === "email" ? "ltr" : "auto"}
        />
        {error ? (
          <p id={`contact-${name}-error`} className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  const messageError = fieldError("message");

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onFocus={ensureToken}
      noValidate={false}
      className="panel grid gap-5 p-6 md:p-7"
      aria-labelledby="contact-form-title"
    >
      <h3 id="contact-form-title" className="heading text-lg">
        {labels.formTitle}
      </h3>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("name", labels.name, { autoComplete: "name", required: true })}
        {field("email", labels.emailField, { type: "email", autoComplete: "email", required: true })}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("company", labels.company, { autoComplete: "organization" })}
        {field("subject", labels.subject, {})}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="contact-message" className="text-sm font-medium">
          {labels.message}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          dir="auto"
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? "contact-message-error" : undefined}
          className={`${inputClass} py-2.5 leading-relaxed`}
        />
        {messageError ? (
          <p id="contact-message-error" className="text-xs text-danger">
            {messageError}
          </p>
        ) : null}
      </div>

      {/* Honeypot: hidden from people and assistive technology, filled in by bots. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {turnstileSiteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-language={locale} />
        </>
      ) : null}

      {formError ? (
        <p
          role="alert"
          className="rounded-[var(--radius)] border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {formError}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center rounded-[var(--radius)] bg-accent px-5 text-sm font-medium text-accent-fg transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_88%,var(--fg))] disabled:opacity-60"
        >
          {pending ? labels.sending : labels.send}
        </button>
      </div>
    </form>
  );
}
