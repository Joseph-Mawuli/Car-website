import nodemailer from 'nodemailer';
import { SMTPServer } from 'smtp-server';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const LINK = 'https://example.test/__/auth/action?mode=resetPassword&oobCode=abc123';
const generatePasswordResetLink = vi.fn(async () => LINK);

const INPUT = { email: 'new.staff@example.com', name: 'Ama <b>Mensah</b>', role: 'sales_assistant' as const, invitedBy: 'Kofi Owner', dealershipName: 'Goddel Motors', isReminder: false };

async function load(envOverrides: Record<string, string> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries(envOverrides)) vi.stubEnv(k, v);
  vi.doMock('../src/lib/firebase.js', () => ({ firebaseAuth: () => ({ generatePasswordResetLink }) }));
  const delivery = await import('../src/services/setupLinkDelivery.js');
  const mailer = await import('../src/services/mailer.js');
  return { ...delivery, setMailer: mailer.setMailer, getMailer: mailer.getMailer };
}

// A real local SMTP server, so the email genuinely travels through nodemailer.
const received: { to: string[]; raw: string }[] = [];
let smtp: SMTPServer;
let port: number;

beforeAll(async () => {
  smtp = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    onData(stream, session, callback) {
      let raw = '';
      stream.on('data', (c: Buffer) => (raw += c.toString()));
      stream.on('end', () => {
        received.push({ to: session.envelope.rcptTo.map((r) => r.address), raw });
        callback();
      });
    },
  });
  await new Promise<void>((resolve) => smtp.listen(0, '127.0.0.1', resolve));
  port = (smtp.server.address() as AddressInfo).port;
});

afterAll(() => new Promise<void>((resolve) => smtp.close(() => resolve())));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock('../src/lib/firebase.js');
  generatePasswordResetLink.mockClear();
  received.length = 0;
});

describe('staff setup-link delivery', () => {
  it('falls back to a manual link when no email method is configured', async () => {
    const { deliverSetupLink, getMailer } = await load();
    expect(getMailer()).toBeNull();
    expect(await deliverSetupLink(INPUT)).toEqual({ method: 'manual', emailed: false, setupLink: LINK });
  });

  it('emails a branded invitation over SMTP and does not return the link to the owner', async () => {
    const { deliverSetupLink, setMailer } = await load();
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port, secure: false, ignoreTLS: true });
    setMailer({ send: async (m) => void (await transport.sendMail({ from: 'Goddel Motors <no-reply@example.com>', ...m })) });

    const result = await deliverSetupLink(INPUT);
    expect(result).toEqual({ method: 'smtp', emailed: true });
    expect(result).not.toHaveProperty('setupLink');

    expect(received).toHaveLength(1);
    expect(received[0].to).toEqual(['new.staff@example.com']);
    const raw = received[0].raw.replace(/=\r?\n/g, '');
    expect(raw).toMatch(/Subject: You've been invited to the Goddel Motors dashboard/);
    expect(raw).toContain('oobCode=3Dabc123'); // quoted-printable "=" in the HTML part
    expect(raw).toContain('Sales Assistant');
    const htmlPart = raw.slice(raw.indexOf('Content-Type: text/html'));
    expect(htmlPart).not.toContain('<b>Mensah</b>');
    expect(htmlPart).toContain('&lt;b&gt;Mensah&lt;/b&gt;');
  });

  it('shows the owner a link with an explanation if the email fails', async () => {
    const { deliverSetupLink, setMailer } = await load();
    setMailer({ send: async () => Promise.reject(new Error('550 mailbox unavailable')) });
    const result = await deliverSetupLink(INPUT);
    expect(result.method).toBe('manual');
    expect(result.setupLink).toBe(LINK);
    expect(result.notice).toMatch(/couldn't be sent/);
  });

  it("uses Firebase's built-in email when only the web API key is configured", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ email: INPUT.email }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { deliverSetupLink } = await load({ FIREBASE_WEB_API_KEY: 'public-web-key' });

    expect(await deliverSetupLink(INPUT)).toEqual({ method: 'firebase', emailed: true });
    expect(generatePasswordResetLink).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('accounts:sendOobCode?key=public-web-key');
    expect(JSON.parse(init.body as string)).toEqual({ requestType: 'PASSWORD_RESET', email: INPUT.email, continueUrl: 'http://localhost:5173/admin/login' });
  });

  it('falls back to a manual link if Firebase rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'UNAUTHORIZED_DOMAIN' } }), { status: 400 })));
    const { deliverSetupLink } = await load({ FIREBASE_WEB_API_KEY: 'public-web-key' });
    const result = await deliverSetupLink(INPUT);
    expect(result).toMatchObject({ method: 'manual', emailed: false, setupLink: LINK });
    expect(result.notice).toBeDefined();
  });

  it('prefers SMTP when it is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { getMailer } = await load({ SMTP_HOST: 'smtp.example.com', MAIL_FROM: 'Goddel <no-reply@example.com>', FIREBASE_WEB_API_KEY: 'k' });
    expect(getMailer()).not.toBeNull();
  });
});
