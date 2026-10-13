import { describe, expect, it } from 'vitest';
import { buildWhatsAppLink, contactNumbers, normalizeWhatsAppNumber } from './contact';

describe('normalizeWhatsAppNumber', () => {
  it('keeps international numbers as digits', () => {
    expect(normalizeWhatsAppNumber('+233 55 606 2526')).toBe('233556062526');
    expect(normalizeWhatsAppNumber('00233 55 606 2526')).toBe('233556062526');
  });

  it('adds the Ghana country code to local numbers', () => {
    expect(normalizeWhatsAppNumber('054 833 0049')).toBe('233548330049');
    expect(buildWhatsAppLink('0504927895')).toBe('https://wa.me/233504927895');
  });
});

describe('contactNumbers', () => {
  it('lists the WhatsApp number first and skips the same number written differently', () => {
    expect(
      contactNumbers({ whatsapp: '+233 55 606 2526', phone: '0556062526', additionalPhones: ['+233 54 833 0049', '+233 50 492 7895'] }),
    ).toEqual(['+233 55 606 2526', '+233 54 833 0049', '+233 50 492 7895']);
  });

  it('returns nothing when no numbers are set', () => {
    expect(contactNumbers({})).toEqual([]);
  });
});
