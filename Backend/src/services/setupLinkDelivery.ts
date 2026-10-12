import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { firebaseAuth } from '../lib/firebase.js';
import { escapeHtml } from '../lib/text.js';
import type { Role } from '../lib/permissions.js';
import { getMailer } from './mailer.js';

export type DeliveryMethod = 'smtp' | 'firebase' | 'manual';

/**
 * How a password-setup link reached the staff member. When it was emailed, the link is
 * NOT returned to the owner's browser — only the recipient ever sees it. `setupLink` is
 * present only for manual delivery (no email configured, or sending failed).
 */
export interface SetupLinkDelivery {
  method: DeliveryMethod;
  emailed: boolean;
  setupLink?: string;
  /** Why email delivery fell back to a manual link, safe to show to the owner. */
  notice?: string;
}

const ROLE_NAMES: Record<Role, string> = {
  owner: 'Owner',
  inventory_manager: 'Inventory Manager',
  sales_assistant: 'Sales Assistant',
};

const loginUrl = () => `${env.PUBLIC_SITE_URL.replace(/\/+$/, '')}/admin/login`;

function generateLink(email: string): Promise<string> {
  return firebaseAuth().generatePasswordResetLink(email, { url: loginUrl(), handleCodeInApp: false });
}

export function inviteEmail(input: { name: string; role: Role; invitedBy: string; link: string; dealershipName: string; isReminder: boolean }) {
  const roleName = ROLE_NAMES[input.role];
  const subject = input.isReminder ? `Your ${input.dealershipName} dashboard sign-in link` : `You've been invited to the ${input.dealershipName} dashboard`;
  const intro = input.isReminder
    ? `Here is a new link to set your password for the ${input.dealershipName} staff dashboard.`
    : `${input.invitedBy} has invited you to the ${input.dealershipName} staff dashboard as ${roleName}.`;
  const text = [
    `Hello ${input.name},`,
    '',
    intro,
    '',
    'Set your password using this link (it expires after a short time and can only be used once):',
    input.link,
    '',
    `Afterwards, sign in at ${loginUrl()}`,
    '',
    "If you weren't expecting this email, you can ignore it.",
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#0b1220">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e3e8ef" cellpadding="0" cellspacing="0">
<tr><td style="background:#0b0f17;border-radius:16px 16px 0 0;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:1px">${escapeHtml(input.dealershipName.toUpperCase())}</td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 12px">Hello ${escapeHtml(input.name)},</p>
<p style="margin:0 0 20px;line-height:1.5">${escapeHtml(intro)}</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#0ea2e0;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">Set your password</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#5b6576;line-height:1.5">The link expires after a short time and can only be used once. Afterwards, sign in at <a href="${escapeHtml(loginUrl())}" style="color:#0784bd">${escapeHtml(loginUrl())}</a>.</p>
<p style="margin:16px 0 0;font-size:13px;color:#5b6576">If you weren't expecting this email, you can ignore it.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}

/** Asks Firebase to send its own (console-customisable) password-setup email. */
async function sendViaFirebase(email: string): Promise<void> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'PASSWORD_RESET', email, continueUrl: loginUrl() }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Firebase sendOobCode failed: ${res.status} ${body.error?.message ?? ''}`.trim());
  }
}

export async function deliverSetupLink(input: { email: string; name: string; role: Role; invitedBy: string; dealershipName: string; isReminder: boolean }): Promise<SetupLinkDelivery> {
  const mailer = getMailer();
  if (mailer) {
    const link = await generateLink(input.email);
    try {
      await mailer.send({ to: input.email, ...inviteEmail({ ...input, link }) });
      return { method: 'smtp', emailed: true };
    } catch (error) {
      logger.error('Invitation email failed; falling back to a manual link', { error: (error as Error).message });
      return { method: 'manual', emailed: false, setupLink: link, notice: "The email couldn't be sent, so please share this link with them yourself." };
    }
  }

  if (env.FIREBASE_WEB_API_KEY) {
    try {
      await sendViaFirebase(input.email);
      return { method: 'firebase', emailed: true };
    } catch (error) {
      logger.error('Firebase setup email failed; falling back to a manual link', { error: (error as Error).message });
      return { method: 'manual', emailed: false, setupLink: await generateLink(input.email), notice: "The email couldn't be sent, so please share this link with them yourself." };
    }
  }

  return { method: 'manual', emailed: false, setupLink: await generateLink(input.email) };
}
