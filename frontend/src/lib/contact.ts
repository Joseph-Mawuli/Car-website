/** Keeps digits only so the number works in wa.me links (international format, no "+"). */
export function normalizeWhatsAppNumber(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function buildWhatsAppLink(number: string, message?: string): string {
  const digits = normalizeWhatsAppNumber(number);
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function buildVehicleWhatsAppMessage(vehicleTitle: string, pageUrl: string): string {
  return `Hello Goddel Motors, I'm interested in the ${vehicleTitle}. Is it still available?\n\n${pageUrl}`;
}

export function buildTelLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function buildMailtoLink(email: string, subject?: string): string {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}
