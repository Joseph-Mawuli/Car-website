import nodemailer, { type Transporter } from 'nodemailer';
import { env, isSmtpConfigured } from '../config/env.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

let transporter: Transporter | null = null;
let override: Mailer | null | undefined;

/** Returns the SMTP mailer, or null when SMTP isn't configured. */
export function getMailer(): Mailer | null {
  if (override !== undefined) return override;
  if (!isSmtpConfigured) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  const t = transporter;
  return {
    async send(message) {
      await t.sendMail({ from: env.MAIL_FROM, ...message });
    },
  };
}

/** Test hook: `undefined` restores the configured mailer. */
export function setMailer(mailer: Mailer | null | undefined): void {
  override = mailer;
}
