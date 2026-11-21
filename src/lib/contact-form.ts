/**
 * Whether the contact form is on (ADR 0008): it is rendered only when the
 * build sets `PUBLIC_CONTACT_FORM_ACTION`, the HTTPS address it posts to.
 * The legal notice must then name the service that receives the messages
 * (its section on the form, which src/content.config.ts requires): while
 * that name is still a placeholder, the build fails, unless it allows
 * placeholders (`ALLOW_TODO=1`, ADR 0007), as previews and tests do.
 */
import { hasPlaceholder } from "./contact-channels";

/**
 * The honeypot's field name: a field people never see or reach, which the
 * service uses to discard the messages robots send. Set to the service's own
 * name when the service is chosen (ADR 0008).
 */
export const honeypotName = "website";

/** What the legal notice says about the form, when it is on. */
export interface LegalFormSection {
  /** The service that receives the messages: its name and address. */
  processor: string;
}

/**
 * The form's address, or `undefined` when the form is off. An address that
 * is not HTTPS, or a form whose service the legal notice does not name yet,
 * fails the build.
 */
export function contactFormAction(
  value: string | undefined,
  legal: LegalFormSection,
  allowTodo: boolean,
): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`PUBLIC_CONTACT_FORM_ACTION is not a URL: ${value}`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`PUBLIC_CONTACT_FORM_ACTION must be an HTTPS address: ${value}`);
  }
  if (hasPlaceholder(legal.processor) && !allowTodo) {
    throw new Error(
      "The contact form is on, but the legal notice does not name the service that receives the messages yet (ADR 0008)",
    );
  }
  return url.href;
}
