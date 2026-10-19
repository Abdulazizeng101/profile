import { Mail, MapPin, Phone } from "lucide-react";

import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { SiteData } from "@/server/content/site";

import { ContactForm } from "./contact-form";
import { PLATFORM_NAMES, SocialIcon } from "./icons";
import { langProps } from "./local-text";
import { Section } from "./section";

export function ContactSection({
  locale,
  data,
  turnstileSiteKey,
}: {
  locale: Locale;
  data: SiteData;
  turnstileSiteKey?: string;
}) {
  const dict = getDictionary(locale);
  const { profile, settings } = data;
  const links = data.social.filter((l) => l.showInContact);
  const { errors, ...rest } = dict.contact;

  return (
    <Section id="contact" title={dict.sections.contact}>
      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-16">
        <div className="grid content-start gap-8">
          {settings.contactHeading.text ? (
            <p
              className="display text-[clamp(2.25rem,5vw,3.5rem)] text-balance"
              {...langProps(settings.contactHeading, locale)}
            >
              {settings.contactHeading.text}
            </p>
          ) : null}
          {settings.contactText.text ? (
            <p
              className="measure text-lg text-pretty text-muted"
              {...langProps(settings.contactText, locale)}
            >
              {settings.contactText.text}
            </p>
          ) : null}

          <dl className="grid gap-4">
            {profile.email ? (
              <div className="grid gap-1">
                <dt className="flex items-center gap-2 text-xs text-subtle">
                  <Mail className="size-3.5" aria-hidden="true" />
                  {dict.contact.email}
                </dt>
                <dd>
                  <a href={`mailto:${profile.email}`} className="link heading text-xl break-all" dir="ltr">
                    {profile.email}
                  </a>
                </dd>
              </div>
            ) : null}
            {profile.phone ? (
              <div className="grid gap-1">
                <dt className="flex items-center gap-2 text-xs text-subtle">
                  <Phone className="size-3.5" aria-hidden="true" />
                  {dict.contact.phone}
                </dt>
                <dd>
                  <a href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`} className="link" dir="ltr">
                    {profile.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {profile.location?.text ? (
              <div className="grid gap-1">
                <dt className="flex items-center gap-2 text-xs text-subtle">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {dict.contact.location}
                </dt>
                <dd {...langProps(profile.location, locale)}>{profile.location.text}</dd>
              </div>
            ) : null}
          </dl>

          {links.length > 0 ? (
            <div className="grid gap-3">
              <h3 className="text-xs text-subtle">{dict.contact.elsewhere}</h3>
              <ul className="grid gap-1">
                {links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer me"
                      className="group inline-flex items-center gap-3 py-1 text-fg"
                    >
                      <SocialIcon platform={link.platform} className="text-muted group-hover:text-fg" />
                      <span className="link">{link.label || PLATFORM_NAMES[link.platform]}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {settings.contactFormEnabled ? (
          <ContactForm locale={locale} labels={{ ...rest, errors }} turnstileSiteKey={turnstileSiteKey} />
        ) : null}
      </div>
    </Section>
  );
}
