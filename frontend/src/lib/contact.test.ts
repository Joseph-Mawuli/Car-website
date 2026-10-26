import { describe, expect, it } from 'vitest';
import { buildGmailComposeLink, buildMailtoLink, buildWhatsAppLink, contactNumbers, normalizeWhatsAppNumber } from './contact';

describe('buildGmailComposeLink', () => {
  it('opens Gmail compose addressed to the recipient, with an optional subject', () => {
    expect(buildGmailComposeLink('godmanagg@gmail.com')).toBe('https://mail.google.com/mail/?view=cm&fs=1&to=godmanagg%40gmail.com');
    expect(buildGmailComposeLink('a@b.com', 'Car & price')).toContain('su=Car+%26+price');
    expect(buildGmailComposeLink('a@b.com', 'Hi', 'Line 1\nLine 2')).toContain('body=Line+1%0ALine+2');
  });
});

describe('buildMailtoLink', () => {
  it('encodes subject and body so email apps keep line breaks and spaces', () => {
    expect(buildMailtoLink('a@b.com')).toBe('mailto:a@b.com');
    expect(buildMailtoLink('a@b.com', 'Car & price', 'Hello,\nThanks')).toBe('mailto:a@b.com?subject=Car%20%26%20price&body=Hello%2C%0D%0AThanks');
  });
});

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
