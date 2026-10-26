/** Ghana; applied to local numbers typed without a country code (e.g. 054 833 0049). */
const DEFAULT_COUNTRY_CODE = '233';

/** Digits in international format with no "+", as wa.me links require. */
export function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return DEFAULT_COUNTRY_CODE + digits.slice(1);
  return digits;
}

export function buildWhatsAppLink(number: string, message?: string): string {
  const digits = normalizeWhatsAppNumber(number);
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function buildVehicleWhatsAppMessage(vehicleTitle: string, pageUrl: string, businessName = 'Goddel Motors'): string {
  return `Hello ${businessName}, I'm interested in the ${vehicleTitle}. Is it still available?\n\n${pageUrl}`;
}

export function buildGeneralWhatsAppMessage(businessName: string): string {
  return `Hello ${businessName}, I would like to enquire about your vehicles.`;
}

export function buildTelLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** The main phone followed by any additional numbers, without duplicates. */
export function allPhones(s: { phone?: string; additionalPhones?: string[] }): string[] {
  return [...new Set([s.phone, ...(s.additionalPhones ?? [])].filter((p): p is string => Boolean(p)))];
}

/** WhatsApp number first, then every phone number, skipping numbers that are the same once normalised. */
export function contactNumbers(s: { whatsapp?: string; phone?: string; additionalPhones?: string[] }): string[] {
  const seen = new Set<string>();
  return [s.whatsapp, ...allPhones(s)].filter((p): p is string => {
    if (!p) return false;
    const key = normalizeWhatsAppNumber(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Opens Gmail's compose screen (the Gmail app on phones), for visitors with no email app set up for mailto links. */
export function buildGmailComposeLink(email: string, subject?: string): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: email, ...(subject ? { su: subject } : {}) });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildMailtoLink(email: string, subject?: string): string {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}
