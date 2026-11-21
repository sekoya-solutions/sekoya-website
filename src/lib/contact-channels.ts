/**
 * The ways to reach the company (src/content/company): the email address and
 * the public profiles. A value still to provide is a `[TODO: …]`
 * placeholder (ADR 0007), shown as its chip with no link.
 */
import { splitPlaceholders } from "./placeholders";

/** A way to reach the company, a field of src/content/company. */
export const contactChannels = ["email", "malt", "linkedin", "github"] as const;

export type ContactChannel = (typeof contactChannels)[number];

/** A channel as a page shows it: what it reads, and its link once its value is known. */
export interface ChannelLink {
  channel: ContactChannel;
  /** The address, or the profile's URL without its scheme; the placeholder until it is known. */
  display: string;
  href?: string;
}

/** Whether a value still holds a placeholder. */
export function hasPlaceholder(value: string): boolean {
  return splitPlaceholders(value).some((part) => part.placeholder);
}

/** A channel's link from its value: an email address or an HTTPS URL. */
export function channelLink(channel: ContactChannel, value: string): ChannelLink {
  if (hasPlaceholder(value)) return { channel, display: value };
  if (channel === "email") return { channel, display: value, href: `mailto:${value}` };
  const url = new URL(value);
  const path = url.pathname.replace(/\/+$/, "");
  return { channel, display: `${url.host.replace(/^www\./, "")}${path}`, href: url.href };
}
